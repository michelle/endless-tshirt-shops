/**
 * Turning a paid Stripe Checkout Session into a Prodigi print order.
 *
 * Called from two places on purpose: the Stripe webhook (primary) and the
 * /success page (fallback, so a shirt still gets printed if webhooks are not
 * configured yet). Both paths therefore have to be safe to run twice.
 *
 * Idempotency without a database:
 *   1. We stash the Prodigi order id in the PaymentIntent's metadata and check
 *      it first. This covers the normal webhook-then-success-page race.
 *   2. We also send Prodigi an `idempotencyKey` derived from the session id, so
 *      a genuinely concurrent double-submit still collapses to one print order.
 * Prodigi's list endpoint ignores its `merchantReference` filter, so it is not
 * usable as a third check.
 */

import type Stripe from 'stripe';
import { findColour, isSize, type Size } from './catalog';
import { createProdigiOrder } from './prodigi';
import { artworkUrl } from './site';
import { stripe } from './stripe';

const ORDER_ID_KEY = 'prodigi_order_id';

export type FulfilResult =
  | { status: 'created' | 'already'; prodigiOrderId: string }
  | { status: 'unpaid' }
  | { status: 'failed'; error: string };

/** Expands the session enough to read the address, PI and metadata in one call. */
export async function retrieveSession(sessionId: string): Promise<Stripe.Checkout.Session> {
  return stripe().checkout.sessions.retrieve(sessionId, {
    expand: ['payment_intent', 'customer_details'],
  });
}

function paymentIntentOf(session: Stripe.Checkout.Session): Stripe.PaymentIntent | null {
  const pi = session.payment_intent;
  if (!pi) return null;
  return typeof pi === 'string' ? null : pi;
}

export function existingOrderId(session: Stripe.Checkout.Session): string | null {
  const pi = paymentIntentOf(session);
  return pi?.metadata?.[ORDER_ID_KEY] ?? null;
}

export async function fulfil(session: Stripe.Checkout.Session, origin: string): Promise<FulfilResult> {
  if (session.payment_status !== 'paid') return { status: 'unpaid' };

  const already = existingOrderId(session);
  if (already) return { status: 'already', prodigiOrderId: already };

  const meta = session.metadata ?? {};
  const timestamp = meta.timestamp;
  const size = meta.size;
  const colour = findColour(meta.colour);

  if (!timestamp || !isSize(size) || !colour) {
    return { status: 'failed', error: 'Session metadata is missing the shirt spec' };
  }

  const shipping = session.collected_information?.shipping_details ?? null;
  const address = shipping?.address;
  const name = shipping?.name ?? session.customer_details?.name;

  if (!address?.line1 || !address.country || !address.city || !address.postal_code || !name) {
    return { status: 'failed', error: 'Session is missing a usable shipping address' };
  }

  try {
    const order = await createProdigiOrder({
      merchantReference: session.id,
      idempotencyKey: session.id,
      recipient: {
        name,
        email: session.customer_details?.email ?? undefined,
        phoneNumber: session.customer_details?.phone ?? undefined,
        address: {
          line1: address.line1,
          line2: address.line2 ?? undefined,
          townOrCity: address.city,
          stateOrCounty: address.state ?? undefined,
          postalOrZipCode: address.postal_code,
          countryCode: address.country,
        },
      },
      size: size as Size,
      colour: colour.id,
      artworkUrl: artworkUrl(origin, colour.ink, timestamp),
      metadata: { timestamp, stripeSession: session.id },
    });

    // Best effort: if this write fails the order still exists, and Prodigi's
    // idempotencyKey keeps a retry from printing a second shirt.
    const pi = paymentIntentOf(session);
    if (pi) {
      try {
        await stripe().paymentIntents.update(pi.id, {
          metadata: { ...pi.metadata, [ORDER_ID_KEY]: order.id },
        });
      } catch (err) {
        console.error('[fulfil] could not record Prodigi order id on PaymentIntent', err);
      }
    }

    return { status: 'created', prodigiOrderId: order.id };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error('[fulfil] Prodigi order failed', error);
    return { status: 'failed', error };
  }
}
