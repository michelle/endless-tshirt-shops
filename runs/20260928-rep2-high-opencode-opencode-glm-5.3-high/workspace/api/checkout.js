// POST /api/checkout — prices the order server-side, verifies the print
// file really exists in this project's blob store, and creates a Stripe
// Checkout Session carrying the full order in its metadata. Fulfillment
// later reads that metadata back — the client can never alter what it paid
// for. Returns the Stripe URL to redirect to.
import { head } from '@vercel/blob';
import { createCheckoutSession } from './_lib/stripe.js';
import { validateCheckout, toMetadata, OrderError } from './_lib/validate.js';
import { readJsonBody, sendJson, requestBase, log } from './_lib/http.js';
import { STORE, findSize } from './_lib/config.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'POST only' });
  if (!process.env.STRIPE_SECRET_KEY) {
    return sendJson(res, 503, { error: 'payments are not configured' });
  }
  const body = await readJsonBody(req);
  let order;
  try {
    order = validateCheckout(body);
  } catch (error) {
    if (error instanceof OrderError) {
      return sendJson(res, 400, { error: error.message, field: error.field });
    }
    log({ checkoutValidationError: String(error) });
    return sendJson(res, 400, { error: 'that order did not validate' });
  }

  // Verify the print file exists in OUR blob store (head() only succeeds
  // for blobs in the store this deployment is connected to).
  try {
    await head(order.print);
  } catch {
    return sendJson(res, 400, { error: 'print file not found — please render your design again', field: 'print' });
  }

  const base = requestBase(req);
  if (!base) return sendJson(res, 400, { error: 'could not resolve the site URL' });

  const size = findSize(order.garment.size);
  const description = `${order.design.placeLabel} · ${order.design.wallISO.replace('T', ' ')} — the sky above, exactly as it stood.`;

  let metadata;
  try {
    metadata = toMetadata(order);
  } catch (error) {
    return sendJson(res, 400, { error: error.message });
  }

  const session = await createCheckoutSession({
    mode: 'payment',
    customer_email: order.address.email,
    line_items: [
      {
        quantity: order.garment.quantity,
        price_data: {
          currency: STORE.currency,
          unit_amount: order.amounts.unitCents,
          product_data: {
            name: `Star-map tee (${size.label}, one of one)`,
            description,
          },
        },
      },
      {
        quantity: 1,
        price_data: {
          currency: STORE.currency,
          unit_amount: order.amounts.shippingCents,
          product_data: { name: 'Shipping' },
        },
      },
    ],
    metadata,
    success_url: `${base}/order.html?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/?cancelled=1`,
  });

  if (!session.ok || !session.data?.url) {
    log({ stripeCheckoutError: session.data, status: session.status });
    return sendJson(res, 502, { error: 'could not start checkout — please try again' });
  }
  log({ checkoutCreated: session.data.id, total: order.amounts.totalCents });
  return sendJson(res, 200, { url: session.data.url, sessionId: session.data.id });
}
