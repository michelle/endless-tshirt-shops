import { getStripe } from "./stripe.js"
import { createPrintOrder, findOrderByReference } from "./prodigi.js"
import { signArt } from "./token.js"
import { SKU } from "./products.js"
import { specFromMetadata } from "./order-meta.js"

/**
 * Submit a paid Stripe Checkout session to Prodigi.
 * Refuses anything that is not paid. Idempotent on the Stripe session id.
 */
export async function fulfillPaidSession(sessionId, origin) {
  if (!sessionId || typeof sessionId !== "string" || !sessionId.startsWith("cs_")) {
    return { ok: false, status: 400, error: "Missing checkout session." }
  }
  const stripe = getStripe()
  const session = await stripe.checkout.sessions.retrieve(sessionId)
  if (session.metadata?.source !== "vesper") {
    return { ok: false, status: 404, error: "Order not found." }
  }
  if (session.payment_status !== "paid") {
    return {
      ok: true,
      paid: false,
      paymentStatus: session.payment_status,
      status: session.status,
    }
  }

  const spec = specFromMetadata(session.metadata)
  const summary = {
    paid: true,
    amountTotal: session.amount_total,
    currency: session.currency,
    email: session.customer_details?.email || session.metadata.email || session.customer_email,
    spec,
    shipping: {
      name: session.metadata.ship_name,
      line1: session.metadata.ship_line1,
      line2: session.metadata.ship_line2 || "",
      city: session.metadata.ship_city,
      state: session.metadata.ship_state || "",
      postal: session.metadata.ship_postal,
      country: session.metadata.ship_country,
    },
  }

  const existing = await findOrderByReference(session.id)
  if (existing) {
    return { ok: true, ...summary, prodigi: publicOrder(existing), alreadySent: true }
  }

  if (!origin || !origin.startsWith("https://")) {
    return {
      ok: false,
      status: 409,
      paid: true,
      ...summary,
      error: "Payment succeeded, but the print file has no public URL yet, so nothing was sent to print.",
    }
  }

  const token = signArt(spec)
  const assetUrl = `${origin}/api/artwork/${token}`
  // Warm the renderer so Prodigi's download is less likely to hit a cold start.
  try {
    await fetch(assetUrl, { method: "GET" })
  } catch {
    // Prodigi retries asset downloads. Don't fail the order on a warm-up miss.
  }

  const created = await createPrintOrder({
    merchantReference: session.id,
    shippingMethod: session.metadata.shipping_method || "Standard",
    recipient: {
      name: session.metadata.ship_name,
      email: summary.email || undefined,
      phoneNumber: session.metadata.ship_phone || undefined,
      address: {
        line1: session.metadata.ship_line1,
        line2: session.metadata.ship_line2 || undefined,
        postalOrZipCode: session.metadata.ship_postal,
        countryCode: session.metadata.ship_country,
        townOrCity: session.metadata.ship_city,
        stateOrCounty: session.metadata.ship_state || undefined,
      },
    },
    sku: SKU,
    copies: spec.quantity,
    color: spec.color,
    size: spec.size,
    assetUrl,
    recipientCost: {
      amount: ((session.amount_total || 0) / 100).toFixed(2),
      currency: (session.currency || "usd").toUpperCase(),
    },
  })

  const order = created.order || created
  return { ok: true, ...summary, prodigi: publicOrder(order), alreadySent: false }
}

function publicOrder(order) {
  if (!order) return null
  return {
    id: order.id,
    stage: order.status?.stage || order.status || null,
    shippingMethod: order.shippingMethod || null,
    created: order.created || null,
  }
}
