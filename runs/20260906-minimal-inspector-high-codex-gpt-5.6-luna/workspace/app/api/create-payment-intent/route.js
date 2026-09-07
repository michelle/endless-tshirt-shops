import { getStripe } from '../../../lib/stripe';

const ALLOWED_STYLES = new Set(['fitted', 'unisex']);
const ALLOWED_SIZES = new Set(['S', 'M', 'L', 'XL']);

function clean(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export async function POST(request) {
  try {
    const stripe = getStripe();
    const body = await request.json();
    const name = clean(body.name);
    const email = clean(body.email).toLowerCase();
    const address = {
      line1: clean(body.address1),
      line2: clean(body.address2),
      city: clean(body.city),
      state: clean(body.state),
      postal_code: clean(body.zip),
      country: clean(body.country || 'US').toUpperCase(),
    };

    if (!name || !/^\S+@\S+\.\S+$/.test(email) || !address.line1 || !address.city || !address.state || !address.postal_code) {
      return Response.json({ error: 'Please enter a complete shipping address and a valid email.' }, { status: 400 });
    }
    if (!ALLOWED_STYLES.has(body.style) || !ALLOWED_SIZES.has(body.size)) {
      return Response.json({ error: 'Please choose a valid shirt style and size.' }, { status: 400 });
    }

    const artworkTimestamp = String(Date.now());
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 2250,
      currency: 'usd',
      automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
      receipt_email: email,
      shipping: { name, address },
      description: `datetime.store ${body.style} shirt, size ${body.size}`,
      metadata: {
        source: 'datetime.store',
        style: body.style,
        size: body.size,
        artwork_timestamp: artworkTimestamp,
      },
    });

    return Response.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      artworkTimestamp,
    });
  } catch (error) {
    console.error('create-payment-intent', error);
    return Response.json({ error: 'We could not start checkout. Please try again.' }, { status: 500 });
  }
}
