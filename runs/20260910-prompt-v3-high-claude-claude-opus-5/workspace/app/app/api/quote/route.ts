import { NextRequest, NextResponse } from 'next/server';
import { decodeDesign, designErrors, unitPriceCents } from '@/lib/design';
import { shippingOptionsFor } from '@/lib/shipping';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  let body: { d?: string; countryCode?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Malformed request.' }, { status: 400 });
  }

  const design = body.d ? decodeDesign(body.d) : null;
  if (!design) return NextResponse.json({ error: 'Invalid design.' }, { status: 400 });

  const errs = designErrors(design);
  if (errs.length) return NextResponse.json({ error: errs[0] }, { status: 400 });

  const country = String(body.countryCode || 'US').toUpperCase();
  if (!/^[A-Z]{2}$/.test(country)) {
    return NextResponse.json({ error: 'Choose a delivery country.' }, { status: 400 });
  }

  const { options, live } = await shippingOptionsFor(design, country);
  const unit = unitPriceCents(design);

  return NextResponse.json({
    unitCents: unit,
    subtotalCents: unit * design.q,
    quantity: design.q,
    options,
    live,
    currency: 'USD',
  });
}
