import { quoteOrder, quoteCosts } from "../../../lib/prodigi.js"
import { retailGarment, retailShipping } from "../../../lib/pricing.js"
import { SHIPPING_METHODS, COLORS, SIZES, COUNTRIES } from "../../../lib/products.js"

export const dynamic = "force-dynamic"

export async function POST(request) {
  let body
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 })
  }
  const country = String(body.country || "").toUpperCase()
  const size = String(body.size || "m")
  const color = String(body.color || "black")
  const copies = Math.max(1, Math.min(3, Math.round(Number(body.quantity) || 1)))
  if (!COUNTRIES.some(([code]) => code === country)) {
    return Response.json({ error: "We don't ship to that country yet." }, { status: 400 })
  }
  if (!SIZES.some((s) => s.id === size) || !COLORS.some((c) => c.id === color)) {
    return Response.json({ error: "Choose a size and colour." }, { status: 400 })
  }

  const methods = await Promise.all(
    SHIPPING_METHODS.map(async (method) => {
      try {
        const raw = await quoteOrder({
          country,
          size,
          color,
          copies,
          shippingMethod: method.id,
        })
        const costs = quoteCosts(raw)
        if (!costs) return { ...method, available: false }
        const garment = retailGarment(costs.item / copies)
        const shipping = retailShipping(costs.shipping)
        return {
          id: method.id,
          label: method.label,
          hint: method.hint,
          available: true,
          garment,
          shipping,
          total: Math.round((garment * copies + shipping) * 100) / 100,
          currency: "USD",
        }
      } catch {
        return { id: method.id, label: method.label, hint: method.hint, available: false }
      }
    })
  )

  if (!methods.some((method) => method.available)) {
    return Response.json(
      { error: "That size can't be shipped to this country from the print network." },
      { status: 400 }
    )
  }
  return Response.json({ methods, currency: "USD" })
}
