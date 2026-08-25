import { NextResponse } from 'next/server';

import { formatMoney } from '@/lib/product';
import { describeStage, getProdigiOrder } from '@/lib/prodigi';
import { ConfigError, getStripe } from '@/lib/stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Order status for the confirmation page. Requires the payment's client secret
 * so an order id alone never discloses a customer's address.
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const clientSecret = new URL(request.url).searchParams.get('cs');

  if (!id.startsWith('pi_')) {
    return NextResponse.json({ error: 'Unknown order.' }, { status: 404 });
  }
  if (!clientSecret) {
    return NextResponse.json({ error: 'Missing payment credentials.' }, { status: 400 });
  }

  try {
    const paymentIntent = await getStripe().paymentIntents.retrieve(id);
    if (paymentIntent.client_secret !== clientSecret) {
      return NextResponse.json({ error: 'Payment credentials do not match.' }, { status: 403 });
    }

    const prodigiOrderId = paymentIntent.metadata?.prodigi_order_id || null;
    const prodigiOrder = prodigiOrderId
      ? await getProdigiOrder(prodigiOrderId)
          .then((r) => r.order)
          .catch(() => null)
      : null;

    const shipment = prodigiOrder?.shipments?.find((s) => s.tracking?.number);

    return NextResponse.json({
      paymentIntentId: paymentIntent.id,
      paymentStatus: paymentIntent.status,
      amount: formatMoney(paymentIntent.amount, paymentIntent.currency),
      epochMs: Number(paymentIntent.metadata?.epoch_ms),
      readable: paymentIntent.metadata?.readable ?? null,
      style: paymentIntent.metadata?.style ?? null,
      size: paymentIntent.metadata?.size ?? null,
      email: paymentIntent.receipt_email,
      shippingName: paymentIntent.shipping?.name ?? null,
      shippingCity: paymentIntent.shipping?.address?.city ?? null,
      shippingCountry: paymentIntent.shipping?.address?.country ?? null,
      printOrderId: prodigiOrderId,
      printStage: describeStage(prodigiOrder),
      printIssues: prodigiOrder?.status?.issues?.map((i) => i.description).filter(Boolean) ?? [],
      thumbnailUrl: prodigiOrder?.items?.[0]?.thumbnailUrl ?? null,
      tracking: shipment?.tracking?.number
        ? { number: shipment.tracking.number, url: shipment.tracking.url ?? null, carrier: shipment.carrier?.service ?? null }
        : null,
      fulfillmentError: paymentIntent.metadata?.fulfillment_error || null,
    });
  } catch (error) {
    if (error instanceof ConfigError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    const message = error instanceof Error ? error.message : 'Could not load that order.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
