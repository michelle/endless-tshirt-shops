import { NextRequest } from 'next/server';
import { decodeDesign, encodeDesign, MAX_SUBTITLE_LEN, MAX_TITLE_LEN } from '@/lib/design';
import { MAX_QTY, PRICE_CENTS, SIZES, inkById, shirtById } from '@/lib/shirts';
import { appBaseUrl, designAssetUrl, stripeApi } from '@/lib/server';

export const runtime = 'nodejs';

interface RecipientInput {
  name?: string;
  email?: string;
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
}

interface CheckoutBody {
  d?: string;
  color?: string;
  ink?: string;
  size?: string;
  qty?: number;
  recipient?: RecipientInput;
}

function bad(message: string) {
  return Response.json({ error: message }, { status: 400 });
}

export async function POST(req: NextRequest) {
  let body: CheckoutBody;
  try {
    body = await req.json();
  } catch {
    return bad('invalid JSON body');
  }

  const design = decodeDesign(body.d || '');
  if (!design) return bad('invalid design');
  if (design.title.length > MAX_TITLE_LEN || design.subtitle.length > MAX_SUBTITLE_LEN)
    return bad('design text too long');

  const shirt = body.color ? shirtById(body.color) : undefined;
  if (!shirt) return bad('choose a shirt color');
  const ink = body.ink ? inkById(body.ink) : undefined;
  if (!ink || ink.forDark !== shirt.dark) return bad('choose a valid ink');
  const size = (body.size || '').toLowerCase();
  if (!(SIZES as readonly string[]).includes(size)) return bad('choose a size');
  const qty = Math.max(1, Math.min(MAX_QTY, Math.floor(body.qty || 1)));

  const r = body.recipient || {};
  const email = (r.email || '').trim();
  if (!r.name?.trim()) return bad('recipient name is required');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return bad('a valid email is required');
  if (!r.line1?.trim()) return bad('address line 1 is required');
  if (!r.city?.trim()) return bad('city is required');
  if (!r.zip?.trim()) return bad('postal/ZIP code is required');
  if (!/^[A-Za-z]{2}$/.test((r.country || '').trim())) return bad('choose a country');

  const trim = (s: string | undefined, n: number) => (s || '').trim().slice(0, n);
  const d = encodeDesign(design);
  const base = appBaseUrl();

  const metadata: Record<string, string> = {
    v: '1',
    d,
    color: shirt.id,
    ink: ink.id,
    size,
    qty: String(qty),
    r_name: trim(r.name, 80),
    r_email: trim(email, 120),
    r_l1: trim(r.line1, 120),
    r_l2: trim(r.line2, 120),
    r_city: trim(r.city, 80),
    r_state: trim(r.state, 80),
    r_zip: trim(r.zip, 20),
    r_cc: trim(r.country, 2).toUpperCase(),
  };

  const previewUrl = `${designAssetUrl(design, ink.id)}&w=768`;

  try {
    const session = await stripeApi<{ url?: string; id?: string }>('/checkout/sessions', 'POST', {
      mode: 'payment',
      success_url: `${base}/order/{CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/design?d=${encodeURIComponent(d)}&color=${shirt.id}&ink=${ink.id}&size=${size}&qty=${qty}`,
      customer_email: metadata.r_email,
      client_reference_id: d.slice(0, 40),
      metadata,
      line_items: [
        {
          quantity: qty,
          price_data: {
            currency: 'usd',
            unit_amount: PRICE_CENTS,
            product_data: {
              name: 'Star Map Tee — your sky, your moment',
              description: `${design.title.toUpperCase()} · ${design.subtitle.toUpperCase()} · ${size.toUpperCase()} ${shirt.name}`,
              images: [previewUrl],
            },
          },
        },
      ],
      shipping_options: [
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: { amount: 0, currency: 'usd' },
            display_name: 'Standard shipping (included)',
            delivery_estimate: {
              minimum: { unit: 'business_day', value: 5 },
              maximum: { unit: 'business_day', value: 12 },
            },
          },
        },
      ],
    });
    if (!session.url) return bad('Stripe did not return a checkout URL');
    return Response.json({ url: session.url });
  } catch (e) {
    return Response.json({ error: `payment setup failed: ${(e as Error).message}` }, { status: 502 });
  }
}
