import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { publicOrigin } from './_lib/design.js';

export const config = { api: { bodyParser: false } };

async function rawBody(request: VercelRequest) {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks);
}

async function sendToProdigi(session: Stripe.Checkout.Session) {
  if (session.payment_status !== 'paid') return;
  const metadata = session.metadata || {};
  const shipping = (session as unknown as { collected_information?: { shipping_details?: { name?: string; address?: Record<string, string | null> } }; shipping_details?: { name?: string; address?: Record<string, string | null> } }).collected_information?.shipping_details
    ?? (session as unknown as { shipping_details?: { name?: string; address?: Record<string, string | null> } }).shipping_details;
  const address = shipping?.address;
  if (!shipping?.name || !address?.line1 || !address?.postal_code || !address?.country || !address?.city) throw new Error('Paid order has incomplete shipping details.');
  if (!metadata.artwork_token || !metadata.shirt_size) throw new Error('Paid order is missing fulfillment metadata.');

  const origin = publicOrigin(metadata.site_origin);
  const prodigiResponse = await fetch(`${process.env.PRODIGI_API_BASE || 'https://api.sandbox.prodigi.com/v4.0'}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-Key': process.env.PRODIGI_API_KEY || '' },
    body: JSON.stringify({
      merchantReference: session.id,
      idempotencyKey: session.id,
      shippingMethod: 'Budget',
      recipient: {
        name: shipping.name,
        email: session.customer_details?.email || undefined,
        phoneNumber: session.customer_details?.phone || undefined,
        address: {
          line1: address.line1,
          line2: address.line2 || undefined,
          postalOrZipCode: address.postal_code,
          countryCode: address.country,
          townOrCity: address.city,
          stateOrCounty: address.state || undefined,
        },
      },
      items: [{
        merchantReference: 'Personalized Orbitline Tee',
        sku: 'GLOBAL-TEE-BC-3001',
        copies: 1,
        sizing: 'fitPrintArea',
        attributes: { color: 'navy blue', size: metadata.shirt_size },
        recipientCost: { amount: '44.00', currency: 'USD' },
        assets: [{ printArea: 'front', url: `${origin}/api/artwork?token=${encodeURIComponent(metadata.artwork_token)}` }],
      }],
      metadata: { stripeCheckoutSession: session.id, customization: { firstName: metadata.first_name, secondName: metadata.second_name, place: metadata.place, date: metadata.moment_date } },
    }),
  });
  const result = await prodigiResponse.json() as { outcome?: string; error?: { message?: string } };
  const accepted = ['created', 'onhold', 'createdwithissues', 'alreadyexists'].includes((result.outcome || '').toLowerCase());
  if (!prodigiResponse.ok || !accepted) throw new Error(result.error?.message || `Prodigi rejected the order (${result.outcome || prodigiResponse.status}).`);
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') return response.status(405).send('Method not allowed.');
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET || !process.env.PRODIGI_API_KEY) return response.status(503).send('Webhook is not configured.');
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const signature = request.headers['stripe-signature'];
    if (typeof signature !== 'string') return response.status(400).send('Missing Stripe signature.');
    const event = stripe.webhooks.constructEvent(await rawBody(request), signature, process.env.STRIPE_WEBHOOK_SECRET);
    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') await sendToProdigi(event.data.object as Stripe.Checkout.Session);
    return response.status(200).json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Webhook failed.';
    return response.status(400).send(message);
  }
}
