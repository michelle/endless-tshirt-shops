import { getStripe } from "../../../../lib/stripe.js"
import { fulfillPaidSession } from "../../../../lib/fulfill.js"
import { publicOrigin } from "../../../../lib/origin.js"

export const dynamic = "force-dynamic"

export async function POST(request) {
  const raw = await request.text()
  let event
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (secret) {
    const signature = request.headers.get("stripe-signature")
    try {
      event = getStripe().webhooks.constructEvent(raw, signature, secret)
    } catch {
      return Response.json({ error: "Invalid signature." }, { status: 400 })
    }
  } else {
    try {
      event = JSON.parse(raw)
    } catch {
      return Response.json({ error: "Invalid payload." }, { status: 400 })
    }
  }

  const type = event?.type
  if (type !== "checkout.session.completed" && type !== "checkout.session.async_payment_succeeded") {
    return Response.json({ received: true, ignored: true })
  }

  const sessionId = event?.data?.object?.id
  if (!sessionId) return Response.json({ received: true, ignored: true })

  try {
    // Authorization is the Stripe API, not the webhook body. An unpaid session
    // is never sent to Prodigi, even if the webhook secret is not configured.
    const result = await fulfillPaidSession(sessionId, publicOrigin(request))
    if (!result.ok && result.paid) {
      return Response.json({ error: result.error }, { status: 500 })
    }
    return Response.json({ received: true, paid: Boolean(result.paid), prodigi: result.prodigi?.id || null })
  } catch (error) {
    console.error("webhook fulfill failed", error?.message)
    return Response.json({ error: "Fulfillment failed." }, { status: 500 })
  }
}
