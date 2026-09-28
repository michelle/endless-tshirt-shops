import Stripe from 'stripe';
import { SHIRTS, validateCustomization } from '@/lib/catalog';
import { sign } from '@/lib/sign';

export const runtime = 'nodejs';

async function createProdigiOrder(
  session: Stripe.Checkout.Session,
  meta: { text: string; style: string; ink: string; shirt: string; size: string },
  origin: string
) {
  // Newer API versions expose shipping under collected_information; accept
  // both shapes since event payloads depend on the sender's API version.
  const anySession = session as unknown as Record<string, any>;
  const shipping =
    anySession.collected_information?.shipping_details ?? anySession.shipping_details;
  const email = session.customer_details?.email;
  if (!shipping?.address || !shipping.name) {
    throw new Error('Session is missing shipping details');
  }
  const addr = shipping.address;
  const sig = sign(meta.text, meta.style, meta.ink);
  const printUrl =
    `${origin}/api/print-image?text=${encodeURIComponent(meta.text)}` +
    `&style=${encodeURIComponent(meta.style)}&ink=${encodeURIComponent(meta.ink)}&sig=${sig}`;

  const payload = {
    merchantReference: session.id,
    idempotencyKey: session.id,
    callbackUrl: `${origin}/api/webhooks/prodigi`,
    shippingMethod: 'Budget',
    recipient: {
      name: shipping.name,
      email: email ?? undefined,
      address: {
        line1: addr.line1 ?? '',
        line2: addr.line2 ?? '',
        postalOrZipCode: addr.postal_code ?? '',
        countryCode: addr.country ?? '',
        townOrCity: addr.city ?? '',
        stateOrCounty: addr.state ?? '',
      },
    },
    items: [
      {
        merchantReference: session.id,
        sku: 'GLOBAL-TEE-BC-3001',
        copies: 1,
        sizing: 'fillPrintArea',
        attributes: { color: SHIRTS[meta.shirt].attr, size: meta.size },
        assets: [{ printArea: 'front', url: printUrl }],
      },
    ],
  };

  const base = process.env.PRODIGI_BASE_URL ?? 'https://api.sandbox.prodigi.com';
  const res = await fetch(`${base}/v4.0/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': process.env.PRODIGI_API_KEY!,
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Prodigi order failed: HTTP ${res.status} ${JSON.stringify(data).slice(0, 500)}`);
  }
  return { id: data?.order?.id as string | undefined, printUrl };
}

export async function POST(req: Request) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const signature = req.headers.get('stripe-signature');
  if (!signature) return Response.json({ error: 'Missing signature' }, { status: 400 });

  const payload = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error('webhook signature verification failed', err);
    return Response.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (event.type !== 'checkout.session.completed') {
    return Response.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const meta = session.metadata ?? {};
  const check = validateCustomization(meta);
  if (!check.ok) {
    // Bad metadata: not retryable, acknowledge so Stripe stops retrying.
    console.error('webhook: invalid session metadata', meta, check.error);
    return Response.json({ error: 'Invalid metadata' }, { status: 400 });
  }

  const origin = new URL(req.url).origin;
  try {
    const { id: prodigiOrderId } = await createProdigiOrder(session, check.value, origin);
    await stripe.checkout.sessions.update(session.id, {
      metadata: {
        ...meta,
        ...(prodigiOrderId ? { prodigiOrderId } : {}),
        prodigiStatus: 'submitted',
      },
    });
    return Response.json({ received: true, prodigiOrderId });
  } catch (err) {
    console.error('webhook: order pipeline failed', err);
    return Response.json({ error: 'Order pipeline failed' }, { status: 500 });
  }
}
