import { NextRequest, NextResponse } from 'next/server';
import { stripe, chunkMeta } from '@/lib/stripe';
import { decodeDesign, designErrors, encodeDesign, formatMoney } from '@/lib/design';
import { shippingOptionsFor, orderTotals } from '@/lib/shipping';
import { COLOR_BY_ID, SIZE_BY_ID, CURRENCY } from '@/lib/catalog';
import { buildSpecimen } from '@/lib/species';
import { reviewText } from '@/lib/moderation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Body = {
  d?: string;
  method?: string;
  email?: string;
  address?: {
    name?: string;
    line1?: string;
    line2?: string;
    townOrCity?: string;
    stateOrCounty?: string;
    postalOrZipCode?: string;
    countryCode?: string;
  };
};

const text = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max);

function originOf(req: NextRequest): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/+$/, '');
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
  const proto = req.headers.get('x-forwarded-proto') || 'https';
  return host ? `${proto}://${host}` : req.nextUrl.origin;
}

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Malformed request.' }, { status: 400 });
  }

  const design = body.d ? decodeDesign(body.d) : null;
  if (!design) return NextResponse.json({ error: 'Invalid design.' }, { status: 400 });
  const errs = designErrors(design);
  if (errs.length) return NextResponse.json({ error: errs[0] }, { status: 400 });

  const rejected = reviewText(design.n, design.p);
  if (rejected) return NextResponse.json({ error: rejected }, { status: 400 });

  const a = body.address ?? {};
  const address = {
    name: text(a.name, 80),
    email: text(body.email, 120).toLowerCase(),
    line1: text(a.line1, 120),
    line2: text(a.line2, 120),
    townOrCity: text(a.townOrCity, 80),
    stateOrCounty: text(a.stateOrCounty, 80),
    postalOrZipCode: text(a.postalOrZipCode, 24),
    countryCode: text(a.countryCode, 2).toUpperCase(),
  };

  const missing: string[] = [];
  if (address.name.length < 2) missing.push('recipient name');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(address.email)) missing.push('a valid email address');
  if (address.line1.length < 3) missing.push('street address');
  if (address.townOrCity.length < 2) missing.push('town or city');
  if (address.postalOrZipCode.length < 3) missing.push('postal or ZIP code');
  if (!/^[A-Z]{2}$/.test(address.countryCode)) missing.push('country');
  if (missing.length) {
    return NextResponse.json({ error: `Please provide ${missing.join(', ')}.` }, { status: 400 });
  }

  // Prices are recomputed here from the size table and a fresh Prodigi quote.
  // Anything the browser claimed about money is ignored.
  const { options } = await shippingOptionsFor(design, address.countryCode);
  const chosen = options.find((o) => o.method === body.method) ?? options[0];
  if (!chosen) {
    return NextResponse.json({ error: 'We cannot ship to that country yet.' }, { status: 400 });
  }
  const totals = orderTotals(design, chosen);

  const token = encodeDesign(design);
  const origin = originOf(req);
  const assetUrl = `${origin}/api/artwork?d=${encodeURIComponent(token)}`;
  const proofUrl = `${origin}/api/artwork?d=${encodeURIComponent(token)}&w=900&garment=1`;

  const specimen = buildSpecimen({ name: design.n, date: design.d, place: design.p, paletteId: design.pal });
  const colour = COLOR_BY_ID[design.col];
  const size = SIZE_BY_ID[design.sz];
  const title = `${specimen.taxon.genus} ${specimen.taxon.epithet} — specimen tee`;
  const description = `${colour?.name ?? design.col}, size ${size?.name ?? design.sz}. Collected by ${specimen.taxon.collector} at ${specimen.taxon.locality}, ${specimen.taxon.dateLong}.`;

  try {
    const session = await stripe().checkout.sessions.create({
      mode: 'payment',
      customer_email: address.email,
      client_reference_id: specimen.taxon.accession,
      line_items: [
        {
          quantity: design.q,
          price_data: {
            currency: CURRENCY.toLowerCase(),
            unit_amount: totals.unitCents,
            product_data: {
              name: title.slice(0, 250),
              description: description.slice(0, 400),
              images: [proofUrl],
            },
          },
        },
      ],
      shipping_options: [
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            display_name: `${chosen.label} delivery`,
            fixed_amount: { amount: totals.shippingCents, currency: CURRENCY.toLowerCase() },
          },
        },
      ],
      // Prodigi needs the address we already validated, so Stripe does not
      // collect a second, possibly different one.
      metadata: {
        ...chunkMeta('design', token),
        ...chunkMeta('ship', JSON.stringify(address)),
        ...chunkMeta('asset', assetUrl),
        method: chosen.method,
        binomial: `${specimen.taxon.genus} ${specimen.taxon.epithet}`,
        accession: specimen.taxon.accession,
      },
      payment_intent_data: {
        description: `Flora Personalis — ${specimen.taxon.accession}`,
        metadata: { accession: specimen.taxon.accession },
      },
      success_url: `${origin}/order?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/design?d=${encodeURIComponent(token)}&cancelled=1`,
      expires_at: Math.floor(Date.now() / 1000) + 60 * 60,
    });

    return NextResponse.json({
      url: session.url,
      totalLabel: formatMoney(totals.totalCents, CURRENCY),
    });
  } catch (err) {
    console.error('checkout session failed', err);
    return NextResponse.json({ error: 'Could not start checkout. Please try again.' }, { status: 500 });
  }
}
