// POST /api/checkout — validate the order, create a Stripe Checkout Session.
import { createCheckoutSession } from '../../../lib/stripe';
import { encodeDesign, decodeDesign } from '../../../lib/params';
import { BASE_PRICE_CENTS, shippingCents, colorById, SIZES, PRODUCT } from '../../../lib/design';

export const runtime = 'nodejs';

const STR = (v, n) => (typeof v === 'string' ? v.trim().slice(0, n) : '');

function baseUrlFrom(request) {
  const proto = request.headers.get('x-forwarded-proto') || 'http';
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  return `${proto}://${host}`;
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'invalid JSON' }, { status: 400 });
  }

  const design = decodeDesign({
    get: (k) => (body?.design?.[k] != null && body.design[k] !== '' ? String(body.design[k]) : null),
  });
  if (!design) return Response.json({ error: 'invalid design' }, { status: 400 });

  const color = colorById(STR(body.color, 40));
  if (!color) return Response.json({ error: 'unknown shirt color' }, { status: 400 });
  design.theme = color.ink; // server is authoritative for ink theme

  const size = STR(body.size, 4).toUpperCase();
  if (!SIZES.includes(size)) return Response.json({ error: 'unknown size' }, { status: 400 });

  const c = body.customer || {};
  const customer = {
    email: STR(c.email, 120),
    name: STR(c.name, 120),
    line1: STR(c.line1, 120),
    line2: STR(c.line2, 120),
    city: STR(c.city, 80),
    state: STR(c.state, 80),
    zip: STR(c.zip, 20),
    country: STR(c.country, 2).toUpperCase(),
  };
  if (!/^\S+@\S+\.\S+$/.test(customer.email)) return Response.json({ error: 'invalid email' }, { status: 400 });
  if (!customer.name || !customer.line1 || !customer.city || !customer.zip || !customer.country) {
    return Response.json({ error: 'missing shipping fields' }, { status: 400 });
  }

  const base = baseUrlFrom(request);
  const ship = shippingCents(customer.country);
  const qs = encodeDesign(design);
  const artPreview = `${base}/api/artwork?${qs}&res=preview`;

  const title = design.line1 || 'Written in the Stars';
  let session;
  try {
    session = await createCheckoutSession({
      mode: 'payment',
      success_url: `${base}/order?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/create?canceled=1`,
      customer_email: customer.email,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: BASE_PRICE_CENTS,
            product_data: {
              name: `${PRODUCT.label} — your custom sky`,
              description: `${color.label} · ${size} · “${title}”`,
              images: [artPreview],
              metadata: { sku: PRODUCT.sku },
            },
          },
        },
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: ship,
            product_data: { name: 'Standard shipping' },
          },
        },
      ],
      metadata: {
        t: String(design.t), lat: String(design.lat), lng: String(design.lng),
        line1: design.line1 || '', place: design.place || '', when: design.when || '',
        coords: design.coords || '', theme: design.theme,
        color: color.id, size,
        email: customer.email,
        ship_name: customer.name, ship_line1: customer.line1, ship_line2: customer.line2,
        ship_city: customer.city, ship_state: customer.state, ship_zip: customer.zip,
        ship_country: customer.country,
      },
    });
  } catch (e) {
    return Response.json({ error: `Stripe: ${e.message}` }, { status: 502 });
  }

  return Response.json({ url: session.url });
}
