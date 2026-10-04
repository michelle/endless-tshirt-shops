import { getStripe } from '@/lib/stripe'
import { originFromHeaders, fulfillSession } from '@/lib/fulfill'

export const dynamic = 'force-dynamic'

// Stripe -> Prodigi webhook. Only paid sessions are sent to print, and
// fulfillment is idempotent on the Stripe session id.
export async function POST(request) {
  const text = await request.text()
  const sig = request.headers.get('stripe-signature')
  const secret = process.env.STRIPE_WEBHOOK_SECRET

  let event
  try {
    event = getStripe().webhooks.constructEvent(text, sig, secret)
  } catch (err) {
    console.error('webhook signature verification failed', err.message)
    return new Response(`signature verification failed: ${err.message}`, { status: 400 })
  }

  if (
    event.type === 'checkout.session.completed' ||
    event.type === 'checkout.session.async_payment_succeeded'
  ) {
    const session = event.data.object
    try {
      const origin = originFromHeaders(request.headers)
      const result = await fulfillSession(session.id, origin)
      console.log(
        `[webhook ${event.type}] session=${session.id} paid=${result.paid} order=${result.orderId || '-'} outcome=${result.outcome || '-'}`
      )
    } catch (err) {
      // Return 500 so Stripe retries; the success page is also a fallback.
      console.error('fulfillment from webhook failed', err)
      return new Response('fulfillment error', { status: 500 })
    }
  } else if (event.type === 'checkout.session.async_payment_failed') {
    console.log(`[webhook] async payment failed for ${event.data.object.id}; not fulfilling`)
  }

  return new Response(null, { status: 200 })
}
