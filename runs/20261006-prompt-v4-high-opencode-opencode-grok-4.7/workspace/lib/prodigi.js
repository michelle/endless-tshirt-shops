const BASE = process.env.PRODIGI_API_BASE || "https://api.sandbox.prodigi.com/v4.0"

function key() {
  const value = process.env.PRODIGI_API_KEY
  if (!value) {
    const error = new Error("Prodigi is not configured")
    error.status = 503
    throw error
  }
  return value
}

async function prodigi(path, { method = "GET", body } = {}) {
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "X-API-Key": key(),
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await response.text()
  let data
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    data = { raw: text }
  }
  if (!response.ok) {
    const error = new Error(data?.failures?.[0]?.description || data?.error || `Prodigi ${response.status}`)
    error.status = response.status
    error.payload = data
    throw error
  }
  return data
}

export async function quoteOrder({ country, size, color, copies, shippingMethod }) {
  return prodigi("/quotes", {
    method: "POST",
    body: {
      shippingMethod,
      destinationCountryCode: country,
      currencyCode: "USD",
      items: [
        {
          sku: "GLOBAL-TEE-GIL-64000",
          copies,
          attributes: { color, size },
          assets: [{ printArea: "front" }],
        },
      ],
    },
  })
}

export function quoteCosts(quoteResponse) {
  const quote = quoteResponse?.quotes?.[0]
  if (!quote?.costSummary) return null
  return {
    item: Number(quote.costSummary.items.amount),
    shipping: Number(quote.costSummary.shipping.amount),
    currency: quote.costSummary.totalCost.currency || "USD",
  }
}

export async function findOrderByReference(merchantReference) {
  const params = new URLSearchParams()
  params.set("merchantReferences", merchantReference)
  params.set("top", "5")
  const data = await prodigi(`/orders?${params.toString()}`)
  const orders = data.orders || []
  return orders.find((order) => order.merchantReference === merchantReference) || null
}

export async function createPrintOrder({
  merchantReference,
  shippingMethod,
  recipient,
  sku,
  copies,
  color,
  size,
  assetUrl,
  recipientCost,
}) {
  return prodigi("/orders", {
    method: "POST",
    body: {
      merchantReference,
      idempotencyKey: merchantReference,
      shippingMethod,
      recipient,
      items: [
        {
          merchantReference: "vesper-shirt",
          sku,
          copies,
          sizing: "fillPrintArea",
          attributes: { color, size },
          recipientCost,
          assets: [{ printArea: "front", url: assetUrl }],
        },
      ],
      metadata: { source: "vesper" },
    },
  })
}
