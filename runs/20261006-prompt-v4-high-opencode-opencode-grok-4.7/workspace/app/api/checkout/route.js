import { getStripe } from "../../../lib/stripe.js"
import { quoteOrder, quoteCosts } from "../../../lib/prodigi.js"
import { retailGarment, retailShipping, toCents } from "../../../lib/pricing.js"
import { normalizeSpec, specErrors } from "../../../lib/spec.js"
import { cleanShipping, cleanContact, shippingErrors } from "../../../lib/shipping.js"
import { metadataFor } from "../../../lib/order-meta.js"
import { publicOrigin } from "../../../lib/origin.js"
import { colorById, COUNTRIES } from "../../../lib/products.js"
import { formatLongDate, joinNames } from "../../../lib/format.js"

export const dynamic = "force-dynamic"

export async function POST(request) {
  let body
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 })
  }

  const spec = normalizeSpec(body)
  const shipping = cleanShipping(body.shipping || {})
  const contact = cleanContact(body.contact || {})
  const errors = [...specErrors(spec), ...shippingErrors(shipping, contact)]
  if (!COUNTRIES.some(([code]) => code === shipping.country)) {
    errors.push("We don't ship to that country yet.")
  }
  if (errors.length) return Response.json({ error: errors[0], errors }, { status: 400 })

  const origin = publicOrigin(request)
  if (!origin) {
    return Response.json(
      { error: "Checkout needs the public store URL. Open the deployed site, not localhost." },
      { status: 400 }
    )
  }

  let costs
  try {
    const raw = await quoteOrder({
      country: shipping.country,
      size: spec.size,
      color: spec.color,
      copies: spec.quantity,
      shippingMethod: shipping.method,
    })
    costs = quoteCosts(raw)
  } catch (error) {
    return Response.json(
      { error: "We couldn't price shipping to that address. Try another method or country." },
      { status: 400 }
    )
  }
  if (!costs) {
    return Response.json({ error: "Shipping isn't available for that selection." }, { status: 400 })
  }

  const garment = retailGarment(costs.item / spec.quantity)
  const shippingPrice = retailShipping(costs.shipping)
  const color = colorById(spec.color)
  const who = joinNames(spec.names)
  const description = [
    spec.place,
    formatLongDate(spec.date),
    spec.time,
    who,
    spec.inscription,
    `${color.label}, ${spec.size.toUpperCase()}`,
  ]
    .filter(Boolean)
    .join(" · ")
    .slice(0, 400)

  let metadata
  try {
    metadata = metadataFor(spec, shipping, contact)
  } catch (error) {
    return Response.json({ error: error.message }, { status: 400 })
  }

  try {
    const stripe = getStripe()
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: contact.email,
      success_url: `${origin}/order/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?canceled=1`,
      metadata,
      payment_intent_data: { metadata },
      line_items: [
        {
          quantity: spec.quantity,
          price_data: {
            currency: "usd",
            unit_amount: toCents(garment),
            product_data: {
              name: "The Vesper Shirt",
              description,
            },
          },
        },
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: toCents(shippingPrice),
            product_data: {
              name: `${labelFor(shipping.method)} shipping`,
              description: `To ${shipping.city}, ${shipping.country}`,
            },
          },
        },
      ],
    })
    return Response.json({ url: session.url, id: session.id })
  } catch (error) {
    console.error("checkout failed", error?.message)
    return Response.json({ error: "Payment couldn't be started. Try again in a moment." }, { status: 502 })
  }
}

function labelFor(method) {
  if (method === "Budget") return "Economy"
  if (method === "Express") return "Express"
  return "Standard"
}
