// Fulfillment orchestration: Stripe payment -> Prodigi print order.
// Idempotent by construction:
//  - Prodigi `idempotencyKey` and `merchantReference` are both the Stripe
//    session id, so double delivery (webhook + success page) can never
//    produce two printed shirts.
//  - An in-process map serialises concurrent attempts.

import { getStripe } from './stripe'
import * as prodigi from './prodigi'
import { validateSpec, encodeSpec, titleFor, PRODUCT, PRICE_CENTS, CURRENCY } from './spec'

const locks = new Map()

export function originFromHeaders(h) {
  let host = h.get('x-forwarded-host') || h.get('host') || 'localhost:3000'
  // cloudflared / proxies may send a comma-separated list
  host = host.split(',')[0].trim()
  let proto = h.get('x-forwarded-proto')
  if (proto) proto = proto.split(',')[0].trim()
  if (!proto) proto = host.startsWith('localhost') || host.startsWith('127.') ? 'http' : 'https'
  return `${proto}://${host}`
}

export async function buildProdigiOrder(session, spec, origin) {
  const designId = encodeSpec(spec)
  const ship = session.shipping_details || {}
  const addr = (ship && ship.address) || {}
  const cust = session.customer_details || {}

  const name = (ship && ship.name) || cust.name || 'Customer'
  const town = addr.city || addr.state || '—'
  const order = {
    merchantReference: session.id,
    idempotencyKey: session.id,
    shippingMethod: 'Standard',
    recipient: {
      name,
      email: cust.email || undefined,
      phoneNumber: cust.phone || (ship && ship.phone) || undefined,
      address: {
        line1: addr.line1 || '—',
        line2: addr.line2 || undefined,
        townOrCity: town,
        stateOrCounty: addr.state || undefined,
        postalOrZipCode: addr.postal_code || '—',
        countryCode: (addr.country || 'US').toUpperCase(),
      },
    },
    items: [
      {
        merchantReference: `${session.id}-tee`,
        sku: PRODUCT.sku,
        copies: spec.q || 1,
        sizing: 'fillPrintArea',
        attributes: { color: spec.c, size: spec.s },
        recipientCost: {
          amount: (PRICE_CENTS / 100).toFixed(2),
          currency: CURRENCY.toUpperCase(),
        },
        assets: [
          {
            printArea: PRODUCT.printArea,
            url: `${origin}/api/print/${designId}/file.png`,
          },
        ],
      },
    ],
    metadata: {
      sessionId: session.id,
      title: titleFor(spec),
      place: spec.p,
      designId,
    },
  }
  return order
}

/**
 * Ensure a paid Stripe session is fulfilled with Prodigi.
 * Returns { paid, orderId, stage, outcome, order?, error? }
 */
export async function fulfillSession(sessionId, origin) {
  const stripe = getStripe()
  const session = await stripe.checkout.sessions.retrieve(sessionId)

  if (session.payment_status !== 'paid') {
    return { paid: false, status: session.status }
  }

  const spec = validateSpec(session.metadata ? JSON.parse(session.metadata.spec || 'null') : null)
  if (!spec) {
    return { paid: true, fulfilled: false, error: 'design spec missing or invalid' }
  }

  // Fast path: already fulfilled?
  const existing = await prodigi.findByMerchantReference(sessionId).catch(() => null)
  if (existing) {
    return {
      paid: true,
      fulfilled: true,
      already: true,
      orderId: existing.id,
      stage: existing.status && existing.status.stage,
      outcome: 'alreadyExists',
    }
  }

  // Serialise concurrent attempts for the same session in this process.
  let lock = locks.get(sessionId)
  if (!lock) {
    lock = (async () => {
      const order = await buildProdigiOrder(session, spec, origin)
      const res = await prodigi.createOrder(order)
      return {
        paid: true,
        fulfilled: true,
        orderId: res.order.id,
        stage: res.order.status && res.order.status.stage,
        outcome: res.outcome,
      }
    })()
    locks.set(sessionId, lock)
    lock.finally(() => locks.delete(sessionId)).catch(() => {})
  }
  return lock
}
