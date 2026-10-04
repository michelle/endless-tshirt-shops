import { getStripe } from '@/lib/stripe'
import { originFromHeaders } from '@/lib/fulfill'
import {
  validateSpec,
  titleFor,
  PRICE_CENTS,
  CURRENCY,
  PRODUCT,
  ALLOWED_COUNTRIES,
} from '@/lib/spec'

export const dynamic = 'force-dynamic'

export async function POST(request) {
  let body
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'invalid JSON body' }, { status: 400 })
  }

  const spec = validateSpec(body && body.spec)
  if (!spec) {
    return Response.json({ error: 'incomplete or invalid design' }, { status: 400 })
  }

  const origin = originFromHeaders(request.headers)

  try {
    const stripe = getStripe()
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: CURRENCY,
            unit_amount: PRICE_CENTS,
            product_data: {
              name: `${PRODUCT.name} — ${titleFor(spec)}`,
              description: `${spec.p || 'Custom place'} · ${spec.d} ${spec.tm} · ${spec.c}, ${spec.s.toUpperCase()}`,
            },
          },
          quantity: spec.q,
        },
      ],
      shipping_address_collection: { allowed_countries: [...new Set(ALLOWED_COUNTRIES)] },
      metadata: { spec: JSON.stringify(spec) },
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/create?cancelled=1`,
    })
    return Response.json({ url: session.url })
  } catch (err) {
    console.error('checkout session failed', err)
    return Response.json({ error: 'could not start checkout' }, { status: 500 })
  }
}
