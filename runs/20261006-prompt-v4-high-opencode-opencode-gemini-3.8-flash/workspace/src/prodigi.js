import { CONFIG } from './config.js';

function getApiKey() {
  const key = CONFIG.prodigiApiKey;
  if (!key) throw new Error('PRODIGI_API_KEY is not set');
  return key;
}

const retryable = (status) =>
  status === 408 || status === 409 || status === 429 || status >= 500;

async function post(path, body, idempotencyKey) {
  let lastError = '';
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`${CONFIG.prodigiBase}${path}`, {
        method: 'POST',
        headers: {
          'X-API-Key': getApiKey(),
          'Content-Type': 'application/json',
          ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
        },
        body: JSON.stringify(body),
      });

      const text = await res.text();
      let data = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = { raw: text };
      }

      if (res.ok) return data;
      lastError = `HTTP ${res.status}: ${text.slice(0, 300)}`;
      if (!retryable(res.status)) break;
    } catch (err) {
      lastError = String(err.message || err);
    }
    await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
  }
  throw new Error(`Prodigi POST ${path} failed: ${lastError}`);
}

export async function canShipTo(sku, countryCode, attributes) {
  try {
    const quote = await post('/Quotes', {
      shippingMethod: 'Budget',
      destinationCountryCode: countryCode,
      currencyCode: 'USD',
      items: [
        {
          sku,
          copies: 1,
          attributes,
          assets: [{ printArea: 'front' }],
        },
      ],
    });
    if (Array.isArray(quote?.quotes) && quote.quotes.length > 0) {
      return { ok: true, reason: 'quoted' };
    }
    return {
      ok: false,
      reason: `${quote?.outcome || 'no outcome'} ${JSON.stringify(quote?.issues || []).slice(0, 200)}`,
    };
  } catch (err) {
    return { ok: false, reason: String(err.message || err).slice(0, 200) };
  }
}

export async function findOrderId(merchantReference) {
  try {
    const res = await fetch(
      `${CONFIG.prodigiBase}/Orders?merchantReferences=${encodeURIComponent(merchantReference)}`,
      {
        headers: { 'X-API-Key': getApiKey() },
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data?.orders?.[0]?.id || null;
  } catch {
    return null;
  }
}

export async function createOrder({
  merchantReference,
  idempotencyKey,
  recipient,
  sku,
  color,
  size,
  copies = 1,
  printUrl,
}) {
  const payload = {
    merchantReference,
    idempotencyKey,
    shippingMethod: 'Budget',
    recipient: {
      name: recipient.name,
      email: recipient.email || undefined,
      phoneNumber: recipient.phoneNumber || undefined,
      address: {
        line1: recipient.address.line1,
        line2: recipient.address.line2 || undefined,
        postalOrZipCode: recipient.address.postalOrZipCode,
        countryCode: recipient.address.countryCode,
        townOrCity: recipient.address.townOrCity,
        stateOrCounty: recipient.address.stateOrCounty || undefined,
      },
    },
    items: [
      {
        merchantReference,
        sku,
        copies,
        sizing: 'fitPrintArea',
        attributes: {
          color,
          size,
        },
        assets: [
          {
            printArea: 'front',
            url: printUrl,
          },
        ],
      },
    ],
  };

  const response = await post('/Orders', payload, idempotencyKey);
  const orderId = response?.order?.id;
  if (!orderId) {
    throw new Error(`Prodigi response missing order ID: ${JSON.stringify(response)}`);
  }
  return {
    id: orderId,
    status: response?.order?.status?.stage || 'Received',
    raw: response,
  };
}
