import { getOrder } from '@/lib/prodigi';
import { stripe } from '@/lib/stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Prodigi status callbacks. The payload is unauthenticated, so it is treated as
 * a hint only: we re-read the order from Prodigi's API and copy the verified
 * stage onto the PaymentIntent that paid for it.
 */
export async function POST(request: Request) {
  let payload: { order?: { id?: string; merchantReference?: string } } | null = null;
  try {
    payload = await request.json();
  } catch {
    return new Response('Malformed payload', { status: 400 });
  }

  const orderId = payload?.order?.id;
  if (!orderId) return Response.json({ received: true });

  try {
    const order = await getOrder(orderId);
    const paymentIntentId = order?.merchantReference;
    if (order && paymentIntentId?.startsWith('pi_')) {
      await stripe().paymentIntents.update(paymentIntentId, {
        metadata: {
          prodigi_stage: order.status?.stage ?? 'InProgress',
          prodigi_order_id: order.id,
        },
      });
      console.log('[prodigi-webhook] updated', paymentIntentId, order.status?.stage);
    }
  } catch (error) {
    console.error('[prodigi-webhook] failed to process callback', orderId, error);
  }

  return Response.json({ received: true });
}
