import { NextResponse } from 'next/server';
import { z } from 'zod';
import { PRICE_CENTS, PRODUCTS } from '@/lib/catalog';
import { appUrl, checkOrigin, isTestMode, safeError, storeId, stripeClient, verifyMoment, required } from '@/lib/server';
import { checkProductAvailability } from '@/lib/prodigi';
export const maxDuration = 60;
export async function POST(request: Request) {
  try { checkOrigin(request); } catch { return NextResponse.json({ error: 'Request not allowed.' }, { status: 403 }); }
  let body;
  try { const raw = await request.text(); if (raw.length > 2000) throw new Error(); body = z.object({ token: z.string().max(600), requestId: z.uuid() }).parse(JSON.parse(raw)); }
  catch { return NextResponse.json({ error: 'Choose a fit and size, then try again.' }, { status: 400 }); }
  let moment;
  try { moment = verifyMoment(body.token); } catch { return NextResponse.json({ error: 'That moment could not be verified. Please capture a new one.' }, { status: 400 }); }
  if (Date.now() - moment.timestamp > 30 * 60 * 1000 || moment.timestamp > Date.now() + 5000) return NextResponse.json({ error: 'That moment has expired. Please try again for a fresh one.' }, { status: 410 });
  try {
    required('STRIPE_WEBHOOK_SECRET');
    if (!isTestMode()) throw new Error('Live launch requires final store policies and operational setup');
    const stripe = stripeClient();
    await checkProductAvailability(moment);
    const base = appUrl();
    const session = await stripe.checkout.sessions.create({
      mode: 'payment', adaptive_pricing: { enabled: false }, payment_method_types: ['card'], client_reference_id: body.requestId,
      line_items: [{ quantity: 1, price_data: { currency: 'usd', unit_amount: PRICE_CENTS, product_data: { name: `The datetime tee · ${moment.timestamp}`, description: `${PRODUCTS[moment.style].name} / ${moment.size} / Black. White timestamp print.`, images: [`${base}/shirt.png`] } } }],
      shipping_address_collection: { allowed_countries: ['US'] },
      shipping_options: [{ shipping_rate_data: { display_name: 'Free standard US shipping', type: 'fixed_amount', fixed_amount: { amount: 0, currency: 'usd' } } }],
      billing_address_collection: 'required',
      success_url: `${base}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/?checkout=canceled`,
      metadata: { store_id: storeId(), timestamp: String(moment.timestamp), style: moment.style, size: moment.size, artwork_token: body.token, fulfillment: 'pending', commerce_mode: isTestMode() ? 'test' : 'live' },
      payment_intent_data: { metadata: { store_id: storeId(), timestamp: String(moment.timestamp), style: moment.style, size: moment.size } },
      custom_text: { submit: { message: isTestMode() ? 'This is a test store. No real payment is taken and no physical shirt will ship.' : 'Made just for your moment. Double-check your fit, size, and address.' } },
    }, { idempotencyKey: `datetime-checkout-${storeId()}-${body.requestId}` });
    return NextResponse.json({ url: session.url, timestamp: moment.timestamp }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { safeError('checkout_failed', error); return NextResponse.json({ error: 'Checkout is taking a breather. Your card has not been charged. Please try again shortly.' }, { status: 503 }); }
}
