import type Stripe from 'stripe';
import { stripe } from './stripe';
import { decodeCart, joinMetadataChunks, sanitizeCart, type CartLine } from './cart';
import { findOrderByReference, placeOrder, type ProdigiOrder, type Recipient } from './prodigi';

export type FulfilResult =
  | { state: 'unpaid'; session: Stripe.Checkout.Session; lines: CartLine[] }
  | { state: 'pending'; session: Stripe.Checkout.Session; lines: CartLine[] }
  | { state: 'placed' | 'existing'; session: Stripe.Checkout.Session; lines: CartLine[]; order: ProdigiOrder }
  | { state: 'error'; session: Stripe.Checkout.Session; lines: CartLine[]; error: string };

function paymentIntentId(session: Stripe.Checkout.Session): string | null {
  const pi = session.payment_intent;
  if (!pi) return null;
  return typeof pi === 'string' ? pi : pi.id;
}

/** Unix seconds at which the shopper actually paid, falling back to session creation. */
function paidAt(session: Stripe.Checkout.Session): number {
  const pi = session.payment_intent;
  if (pi && typeof pi !== 'string' && typeof pi.created === 'number') return pi.created;
  return session.created;
}

const CLAIM_KEY = 'fulfil_claim';
const CLAIM_TTL_MS = 5 * 60 * 1000;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Prodigi has no idempotency key and does not reject duplicate merchantReferences,
 * so a naive check-then-create races between the webhook and the /order page and
 * would print (and charge us for) the order twice.
 *
 * We take a short-lived claim on the Stripe session's metadata and re-read it after a
 * beat: whoever's nonce survives is the only caller that may create the Prodigi order.
 */
async function takeClaim(sessionId: string, existing: Stripe.Metadata | null): Promise<boolean> {
  const held = existing?.[CLAIM_KEY];
  if (held) {
    const heldAt = Number(held.split('@')[1] ?? 0);
    if (Date.now() - heldAt < CLAIM_TTL_MS) return false;
  }
  const nonce = `${Math.random().toString(36).slice(2, 10)}@${Date.now()}`;
  await stripe().checkout.sessions.update(sessionId, { metadata: { [CLAIM_KEY]: nonce } });
  await sleep(1200);
  const fresh = await stripe().checkout.sessions.retrieve(sessionId);
  return fresh.metadata?.[CLAIM_KEY] === nonce;
}

type ShippingDetails = {
  name?: string | null;
  address?: {
    line1?: string | null; line2?: string | null; city?: string | null;
    state?: string | null; postal_code?: string | null; country?: string | null;
  } | null;
};

/** Stripe moved shipping onto `collected_information`; older API versions expose it flat. */
type AnySession = Stripe.Checkout.Session & {
  collected_information?: { shipping_details?: ShippingDetails | null } | null;
  shipping_details?: ShippingDetails | null;
};

function recipientFrom(session: AnySession): Recipient | null {
  const ship = session.collected_information?.shipping_details ?? session.shipping_details ?? null;
  const addr = ship?.address ?? session.customer_details?.address ?? null;
  if (!addr?.line1 || !addr.country || !addr.postal_code || !addr.city) return null;
  return {
    name: ship?.name ?? session.customer_details?.name ?? 'Customer',
    email: session.customer_details?.email ?? undefined,
    phoneNumber: session.customer_details?.phone ?? undefined,
    address: {
      line1: addr.line1,
      line2: addr.line2 ?? undefined,
      townOrCity: addr.city,
      stateOrCounty: addr.state ?? undefined,
      postalOrZipCode: addr.postal_code,
      countryCode: addr.country,
    },
  };
}

export function linesFromSession(session: Stripe.Checkout.Session): CartLine[] {
  return sanitizeCart(decodeCart(joinMetadataChunks(session.metadata)));
}

/**
 * Turns a paid Checkout Session into a Prodigi order. Idempotent: the Stripe session id
 * is the Prodigi merchantReference, so calling this twice never double-prints.
 */
export async function fulfilSession(
  sessionId: string,
  origin: string,
  opts: { graceMs?: number } = {}
): Promise<FulfilResult> {
  const session = (await stripe().checkout.sessions.retrieve(sessionId, {
    expand: ['payment_intent'],
  })) as AnySession;
  const lines = linesFromSession(session);

  if (session.payment_status !== 'paid') return { state: 'unpaid', session, lines };
  if (lines.length === 0) return { state: 'error', session, lines, error: 'No orderable items on this session.' };

  const recipient = recipientFrom(session);
  if (!recipient) return { state: 'error', session, lines, error: 'No usable shipping address on this session.' };

  try {
    const existing = await findOrderByReference(session.id);
    if (existing) return { state: 'existing', session, lines, order: existing };
    // When a webhook is configured it is the primary writer; the page only self-heals
    // once the webhook has clearly had its chance. Measure from *payment*, not from
    // session creation — a shopper can sit on the Stripe form for minutes.
    const graceMs = opts.graceMs ?? 0;
    if (Date.now() - paidAt(session) * 1000 < graceMs) return { state: 'pending', session, lines };

    if (!(await takeClaim(session.id, session.metadata))) {
      // Another worker is placing this order right now.
      return { state: 'pending', session, lines };
    }

    // Re-check inside the claim, in case the other worker finished while we waited.
    const raced = await findOrderByReference(session.id);
    if (raced) return { state: 'existing', session, lines, order: raced };

    const { order, created } = await placeOrder({
      reference: session.id,
      recipient,
      lines,
      origin,
      metadata: {
        stripeSessionId: session.id,
        stripePaymentIntent: paymentIntentId(session) ?? '',
        store: 'last-shift',
      },
    });
    return { state: created ? 'placed' : 'existing', session, lines, order };
  } catch (e) {
    return { state: 'error', session, lines, error: e instanceof Error ? e.message : String(e) };
  }
}

/** How long after payment the /order page gives up on the webhook and places the order itself. */
export const WEBHOOK_GRACE_MS = 90 * 1000;
