import Stripe from 'stripe';

export const runtime = 'nodejs';

const VALID_FITS = new Set(['fitted', 'unisex']);
const VALID_SIZES = new Set(['S', 'M', 'L', 'XL']);

function getOrigin(request) {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (configured) return configured.replace(/\/$/, '');
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  const protocol = request.headers.get('x-forwarded-proto') || 'https';
  return `${protocol}://${host}`;
}

export async function POST(request) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return Response.json({ error: 'Payments are not configured yet.' }, { status: 503 });
    }
    const { fit, size, timestamp } = await request.json();
    if (!VALID_FITS.has(fit) || !VALID_SIZES.has(size) || !Number.isSafeInteger(timestamp)) {
      return Response.json({ error: 'Please choose a valid fit and size.' }, { status: 400 });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const origin = getOrigin(request);
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_creation: 'always',
      billing_address_collection: 'required',
      phone_number_collection: { enabled: true },
      shipping_address_collection: { allowed_countries: ['US'] },
      shipping_options: [{ shipping_rate_data: { type: 'fixed_amount', fixed_amount: { amount: 0, currency: 'usd' }, display_name: 'Free standard shipping', delivery_estimate: { minimum: { unit: 'business_day', value: 5 }, maximum: { unit: 'business_day', value: 10 } } } }],
      line_items: [{
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: 2250,
          product_data: { name: 'The datetime shirt', description: `${fit} fit · ${size} · timestamp ${timestamp}` },
        },
      }],
      metadata: { fit, size, timestamp: String(timestamp) },
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/`,
    });
    return Response.json({ url: session.url });
  } catch (error) {
    console.error('Checkout session error', error);
    return Response.json({ error: 'Checkout could not be started. Please try again.' }, { status: 500 });
  }
}
