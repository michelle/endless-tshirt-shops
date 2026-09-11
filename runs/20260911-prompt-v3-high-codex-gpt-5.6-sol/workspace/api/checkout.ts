import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { publicOrigin, sealDesign, validateDesign } from './_lib/design.js';

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed.' });
  if (!process.env.STRIPE_SECRET_KEY) return response.status(503).json({ error: 'Checkout is being connected. Please try again shortly.' });
  if (!process.env.PRODIGI_API_KEY) return response.status(503).json({ error: 'Print fulfillment is not configured.' });

  try {
    const design = validateDesign(request.body);
    const origin = publicOrigin(request.headers.origin);
    const artworkToken = sealDesign(design, process.env.PRODIGI_API_KEY);
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_creation: 'always',
      billing_address_collection: 'required',
      shipping_address_collection: { allowed_countries: ['US'] },
      phone_number_collection: { enabled: true },
      success_url: `${origin}/?success=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?cancelled=1`,
      line_items: [{
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: 4400,
          product_data: {
            name: 'Personalized Orbitline Tee',
            description: `${design.firstName} × ${design.secondName} · ${design.place} · ${design.date} · Size ${design.size.toUpperCase()}`,
          },
        },
      }],
      metadata: {
        first_name: design.firstName,
        second_name: design.secondName,
        place: design.place,
        moment_date: design.date,
        shirt_size: design.size,
        artwork_token: artworkToken,
        site_origin: origin,
      },
      payment_intent_data: { metadata: { product: 'orbitline-tee', shirt_size: design.size } },
    });
    if (!session.url) throw new Error('Stripe did not return a checkout URL.');
    return response.status(200).json({ url: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Checkout could not be started.';
    return response.status(400).json({ error: message });
  }
}
