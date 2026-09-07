const PRODIGI_BASE_URL = 'https://api.sandbox.prodigi.com/v4.0';
const PRODUCT_SKUS = {
  fitted: 'GLOBAL-TEE-BC-6004',
  unisex: 'GLOBAL-TEE-BC-3001',
};
const PRODUCT_ATTRIBUTES = {
  fitted: { brand: 'Bella + Canvas', edge: 'Crew neck', color: 'black', gender: "Women's", paperType: '60% cotton, 40% polyester', style: '6004' },
  unisex: { brand: 'Bella + Canvas', edge: 'Crew neck', color: 'black', gender: 'Unisex', paperType: '100% cotton', style: '3001' },
};
const SIZE_MAP = { S: 's', M: 'm', L: 'l', XL: 'xl' };

function appUrl() {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (configured) return configured.replace(/\/$/, '');
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
}

export function makeArtworkUrl(timestamp, style) {
  const params = new URLSearchParams({ timestamp: String(timestamp), style });
  return `${appUrl()}/api/artwork?${params.toString()}`;
}

export async function submitProdigiOrder({
  paymentIntentId,
  email,
  shipping,
  size,
  style,
  artworkTimestamp,
}) {
  if (!process.env.PRODIGI_API_KEY) {
    throw new Error('PRODIGI_API_KEY is not configured');
  }

  const countryCode = shipping.address.country || 'US';
  const payload = {
    shippingMethod: 'Budget',
    merchantReference: `datetime-${paymentIntentId}`,
    idempotencyKey: `datetime-${paymentIntentId}`,
    recipient: {
      name: shipping.name,
      email,
      address: {
        line1: shipping.address.line1,
        ...(shipping.address.line2 ? { line2: shipping.address.line2 } : {}),
        townOrCity: shipping.address.city,
        stateOrCounty: shipping.address.state,
        postalOrZipCode: shipping.address.postal_code,
        countryCode,
      },
    },
    items: [
      {
        sku: PRODUCT_SKUS[style],
        copies: 1,
        sizing: 'fitPrintArea',
        attributes: {
          ...PRODUCT_ATTRIBUTES[style],
          size: SIZE_MAP[size],
        },
        assets: [
          {
            printArea: 'front',
            url: makeArtworkUrl(artworkTimestamp, style),
          },
        ],
      },
    ],
    metadata: {
      source: 'datetime.store',
      paymentIntentId,
      shirtStyle: style,
      shirtSize: size,
    },
  };

  const response = await fetch(`${PRODIGI_BASE_URL}/Orders`, {
    method: 'POST',
    headers: {
      'X-API-Key': process.env.PRODIGI_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.outcome === 'CreatedWithIssues' || result.outcome === 'Error') {
    const issue = result.issues?.[0]?.description || result.message || `Prodigi request failed (${response.status})`;
    throw new Error(issue);
  }

  return result.order || result;
}

export { PRODUCT_SKUS };
