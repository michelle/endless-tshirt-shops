import "server-only";
import type Stripe from "stripe";
import { stripe } from "./stripe";
import { createProdigiOrder, getProdigiOrder, type ProdigiAddress, type ProdigiOrder } from "./prodigi";
import { COLOR_BY_ID, PRINT_AREA, PRODIGI_SKU, isSize, type Size } from "./catalog";
import { decodeDesign, encodeDesign, parseDesign, parseSelection, type DesignParams } from "./schema";
import { siteUrl } from "./site";

/**
 * Fulfilment is keyed entirely off the Stripe Checkout Session, so there is no
 * database to keep in sync:
 *  - session metadata carries the design and the chosen garment
 *  - the PaymentIntent metadata records the Prodigi order id once placed
 *  - Prodigi's idempotencyKey (the session id) makes retries safe
 */

export interface FulfilmentResult {
  prodigiOrderId: string | null;
  outcome: string;
  alreadyFulfilled: boolean;
}

function shippingDetails(
  session: Stripe.Checkout.Session,
): { name: string; address: Stripe.Address } | null {
  const collected = session.collected_information?.shipping_details;
  if (collected?.address) return { name: collected.name ?? "", address: collected.address };
  const legacy = (session as unknown as { shipping_details?: { name?: string; address?: Stripe.Address } }).shipping_details;
  if (legacy?.address) return { name: legacy.name ?? "", address: legacy.address };
  return null;
}

function toProdigiAddress(address: Stripe.Address): ProdigiAddress | null {
  if (!address.line1 || !address.city || !address.postal_code || !address.country) return null;
  return {
    line1: address.line1,
    line2: address.line2 ?? undefined,
    townOrCity: address.city,
    stateOrCounty: address.state ?? undefined,
    postalOrZipCode: address.postal_code,
    countryCode: address.country,
  };
}

async function paymentIntentOf(session: Stripe.Checkout.Session): Promise<Stripe.PaymentIntent | null> {
  const intent = session.payment_intent;
  if (!intent) return null;
  if (typeof intent !== "string") return intent;
  return stripe().paymentIntents.retrieve(intent);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Poll briefly for a concurrent invocation's Prodigi order id. */
async function waitForPlacedOrder(sessionId: string): Promise<string | null> {
  for (let attempt = 0; attempt < 5; attempt++) {
    await sleep(600);
    try {
      const session = await stripe().checkout.sessions.retrieve(sessionId, { expand: ["payment_intent"] });
      const intent = typeof session.payment_intent === "object" ? session.payment_intent : null;
      const placed = intent?.metadata?.prodigi_order_id;
      if (placed) return placed;
    } catch {
      /* keep polling */
    }
  }
  return null;
}

/** Place the Prodigi order for a paid session, exactly once. */
export async function ensureFulfilled(sessionId: string): Promise<FulfilmentResult> {
  const session = await stripe().checkout.sessions.retrieve(sessionId, { expand: ["payment_intent"] });
  if (session.payment_status !== "paid") {
    return { prodigiOrderId: null, outcome: `not paid (${session.payment_status})`, alreadyFulfilled: false };
  }
  const intent = await paymentIntentOf(session);
  const existing = intent?.metadata?.prodigi_order_id;
  if (existing) return { prodigiOrderId: existing, outcome: "already placed", alreadyFulfilled: true };

  const metadata = session.metadata ?? {};
  let design: DesignParams;
  let size: Size;
  let color: string;
  let quantity: number;
  try {
    design = decodeDesign(metadata.design ?? "");
    const selection = parseSelection({ size: metadata.size, color: metadata.color, quantity: metadata.quantity });
    size = selection.size;
    color = selection.color;
    quantity = selection.quantity;
  } catch (error) {
    throw new Error(`Session ${sessionId} has invalid product metadata: ${(error as Error).message}`);
  }

  const shirt = COLOR_BY_ID.get(color);
  if (!shirt || !isSize(size)) throw new Error(`Session ${sessionId} references an unknown garment`);

  const ship = shippingDetails(session);
  const address = ship ? toProdigiAddress(ship.address) : null;
  if (!address) throw new Error(`Session ${sessionId} has no usable shipping address`);

  const artworkUrl = `${siteUrl()}/api/artwork?d=${encodeDesign(design)}`;
  const recipientName = ship?.name || session.customer_details?.name || "Customer";

  let response;
  try {
    response = await createProdigiOrder({
      merchantReference: session.id,
      idempotencyKey: session.id,
      shippingMethod: "Standard",
      recipient: {
        name: recipientName,
        email: session.customer_details?.email ?? undefined,
        phoneNumber: session.customer_details?.phone ?? undefined,
        address,
      },
      items: [
        {
          merchantReference: `${session.id}-1`,
          sku: PRODIGI_SKU,
          copies: quantity,
          sizing: "fitPrintArea",
          attributes: { color, size },
          assets: [{ printArea: PRINT_AREA, url: artworkUrl }],
        },
      ],
      metadata: {
        stripe_session: session.id,
        title: design.title.slice(0, 100),
        palette: design.palette,
      },
    });
  } catch (error) {
    // The webhook and the confirmation page can both try to fulfil the same
    // session at once. Prodigi's idempotency key makes that safe, but a losing
    // concurrent request can still surface as an error before the winner has
    // written the order id back. Re-read the PaymentIntent and adopt it.
    const recovered = await waitForPlacedOrder(sessionId);
    if (recovered) return { prodigiOrderId: recovered, outcome: "already placed", alreadyFulfilled: true };
    throw error;
  }

  const orderId = response.order?.id ?? null;
  if (intent && orderId) {
    await stripe().paymentIntents.update(intent.id, {
      metadata: {
        ...intent.metadata,
        prodigi_order_id: orderId,
        prodigi_outcome: response.outcome,
        prodigi_env: (process.env.PRODIGI_API_URL ?? "").includes("sandbox") || !process.env.PRODIGI_API_URL ? "sandbox" : "live",
      },
    });
  }
  return {
    prodigiOrderId: orderId,
    outcome: response.outcome,
    alreadyFulfilled: response.outcome === "AlreadyExists",
  };
}

export interface OrderView {
  sessionId: string;
  paymentStatus: string;
  email: string | null;
  amountTotal: number | null;
  currency: string | null;
  design: DesignParams | null;
  selection: { size: string; color: string; colorLabel: string; quantity: number } | null;
  shipTo: { name: string; address: Stripe.Address } | null;
  prodigi: {
    id: string;
    stage: string;
    issues: string[];
    shipments: NonNullable<ProdigiOrder["shipments"]>;
    error?: string;
  } | null;
}

/** Everything the confirmation page needs, gathered from Stripe and Prodigi. */
export async function loadOrder(sessionId: string): Promise<OrderView | null> {
  let session: Stripe.Checkout.Session;
  try {
    session = await stripe().checkout.sessions.retrieve(sessionId, { expand: ["payment_intent"] });
  } catch {
    return null;
  }
  const metadata = session.metadata ?? {};
  let design: DesignParams | null = null;
  try {
    design = parseDesign(decodeDesign(metadata.design ?? ""));
  } catch {
    design = null;
  }
  const color = COLOR_BY_ID.get(metadata.color ?? "");
  const intent = typeof session.payment_intent === "object" ? session.payment_intent : null;
  const prodigiId = intent?.metadata?.prodigi_order_id ?? null;

  let prodigi: OrderView["prodigi"] = null;
  if (prodigiId) {
    try {
      const { order } = await getProdigiOrder(prodigiId);
      prodigi = {
        id: order.id,
        stage: order.status?.stage ?? "Unknown",
        issues: (order.status?.issues ?? []).map((i) => `${i.errorCode}: ${i.description}`),
        shipments: order.shipments ?? [],
      };
    } catch (error) {
      prodigi = { id: prodigiId, stage: "Unknown", issues: [], shipments: [], error: (error as Error).message };
    }
  }

  return {
    sessionId: session.id,
    paymentStatus: session.payment_status,
    email: session.customer_details?.email ?? null,
    amountTotal: session.amount_total,
    currency: session.currency,
    design,
    selection: color && isSize(metadata.size)
      ? { size: metadata.size, color: color.id, colorLabel: color.label, quantity: Number(metadata.quantity ?? 1) }
      : null,
    shipTo: shippingDetails(session),
    prodigi,
  };
}
