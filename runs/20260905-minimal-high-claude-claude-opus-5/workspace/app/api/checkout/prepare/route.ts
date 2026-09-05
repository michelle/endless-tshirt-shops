import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { STYLE_SPECS } from '@/lib/products';
import {
  ValidationError,
  draftToMetadata,
  parseOrderDraft,
  prodigiAttributes,
} from '@/lib/order';
import { ProdigiError, blockingIssues, getQuote } from '@/lib/prodigi';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Last stop before we take the money.
 *
 * Mirrors the original store's Scalable Press flow: quote the print job first
 * so an unshippable address or an out-of-stock blank fails *before* the card is
 * charged, then stash the order on the PaymentIntent so fulfilment can run from
 * the webhook without any other state.
 */
export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Malformed request' }, { status: 400 });
  }

  const paymentIntentId = String(body?.paymentIntentId ?? '');
  const clientSecret = String(body?.clientSecret ?? '');
  if (!paymentIntentId || !clientSecret) {
    return NextResponse.json({ error: 'Missing checkout session' }, { status: 400 });
  }

  let draft;
  try {
    draft = parseOrderDraft(body);
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json(
        { error: err.message, field: err.field },
        { status: 400 },
      );
    }
    throw err;
  }

  const s = stripe();
  let intent;
  try {
    intent = await s.paymentIntents.retrieve(paymentIntentId);
  } catch {
    return NextResponse.json({ error: 'Checkout session expired' }, { status: 404 });
  }

  // The client secret is the buyer's proof that this session is theirs.
  if (intent.client_secret !== clientSecret) {
    return NextResponse.json({ error: 'Checkout session mismatch' }, { status: 403 });
  }
  if (intent.status === 'succeeded') {
    return NextResponse.json({ error: 'This order was already paid' }, { status: 409 });
  }

  // Quote the print job. This validates the destination and tells us the true
  // fulfilment cost, which we record alongside the payment.
  let quoteCost: string | undefined;
  let quoteCurrency: string | undefined;
  try {
    const { quote, issues } = await getQuote({
      sku: STYLE_SPECS[draft.style].sku,
      attributes: prodigiAttributes(draft),
      destinationCountryCode: draft.address.country,
    });

    const blocking = blockingIssues(issues);
    if (blocking.length) {
      return NextResponse.json(
        { error: blocking[0].description, issues: blocking },
        { status: 400 },
      );
    }
    if (!quote) {
      return NextResponse.json(
        { error: 'We cannot print and ship to that address right now.' },
        { status: 400 },
      );
    }
    quoteCost = quote.costSummary.totalCost?.amount;
    quoteCurrency = quote.costSummary.totalCost?.currency;
  } catch (err) {
    if (err instanceof ProdigiError) {
      const blocking = blockingIssues(err.issues);
      return NextResponse.json(
        {
          error:
            blocking[0]?.description ||
            'We cannot print and ship to that address right now.',
        },
        { status: 400 },
      );
    }
    console.error('[prepare] Prodigi quote failed', err);
    return NextResponse.json(
      { error: 'Our print partner is not responding. Try again shortly.' },
      { status: 502 },
    );
  }

  try {
    await s.paymentIntents.update(paymentIntentId, {
      receipt_email: draft.email,
      description: `datetime.store — ${draft.style} tee, size ${draft.size} @ ${draft.ts}`,
      // Deliberately not setting `shipping` here: Elements sends the shipping
      // address itself at confirm time, and Stripe rejects a publishable key
      // overwriting a value a secret key already wrote. Metadata is our record.
      metadata: {
        ...draftToMetadata(draft),
        fulfillment_status: 'awaiting_payment',
        prodigi_quote_total: quoteCost ?? '',
        prodigi_quote_currency: quoteCurrency ?? '',
      },
    });
  } catch (err) {
    console.error('[prepare] could not update PaymentIntent', err);
    return NextResponse.json(
      { error: 'Could not save your order details. Try again.' },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    fulfillmentCost: quoteCost ? { amount: quoteCost, currency: quoteCurrency } : null,
  });
}
