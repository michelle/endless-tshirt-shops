// Minimal Prodigi Print API (v4.0) client. Sandbox by default.

const BASE = process.env.PRODIGI_BASE_URL || 'https://api.sandbox.prodigi.com/v4.0'

async function call(pathname, init = {}) {
  const key = process.env.PRODIGI_API_KEY
  if (!key) throw new Error('PRODIGI_API_KEY is not configured')
  const res = await fetch(BASE + pathname, {
    ...init,
    headers: {
      'X-API-Key': key,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  })
  const text = await res.text()
  let body
  try {
    body = JSON.parse(text)
  } catch {
    body = { raw: text }
  }
  if (!res.ok) {
    const err = new Error(`Prodigi ${res.status}: ${text.slice(0, 400)}`)
    err.status = res.status
    err.body = body
    throw err
  }
  return body
}

export function createOrder(order) {
  return call('/orders', { method: 'POST', body: JSON.stringify(order) })
}

export function getOrder(orderId) {
  return call(`/orders/${encodeURIComponent(orderId)}`)
}

export async function findByMerchantReference(ref) {
  const qs = new URLSearchParams({ top: '5' })
  qs.append('merchantReferences', ref)
  const body = await call(`/orders?${qs.toString()}`)
  return body.orders && body.orders.length ? body.orders[0] : null
}
