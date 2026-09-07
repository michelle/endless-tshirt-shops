export const maxDuration = 15;

const PRODIGI_ENDPOINT = 'https://api.sandbox.prodigi.com/v4.0/orders';
const SHIRT_SKU = 'GLOBAL-TEE-BC-3001';

const catalog = {
  'night-signal': { color: 'black', asset: 'night-signal.png' },
  'lunar-static': { color: 'cream', asset: 'lunar-static.png' },
  'dead-air-club': { color: 'burnt orange', asset: 'dead-air-club.png' },
} as const;

const allowedSizes = new Set(['s', 'm', 'l', 'xl', '2xl']);

type CheckoutBody = {
  cart?: Array<{ productId?: string; size?: string; quantity?: number }>;
  recipient?: Record<string, unknown>;
};

function textField(value: unknown, maxLength = 120) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

export function GET() {
  return json({
    ok: true,
    fulfillment: 'Prodigi sandbox',
    configured: Boolean(process.env.PRODIGI_API_KEY),
  });
}

export async function POST(request: Request) {
  if (!process.env.PRODIGI_API_KEY) {
    return json({ error: 'Sandbox fulfillment is not configured.' }, 503);
  }

  let body: CheckoutBody;
  try {
    body = (await request.json()) as CheckoutBody;
  } catch {
    return json({ error: 'Invalid checkout request.' }, 400);
  }

  if (!Array.isArray(body.cart) || body.cart.length === 0 || body.cart.length > 10) {
    return json({ error: 'Your bag must contain between 1 and 10 line items.' }, 400);
  }

  const totalQuantity = body.cart.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0),
    0,
  );
  if (totalQuantity < 1 || totalQuantity > 10) {
    return json({ error: 'Orders are limited to 10 shirts.' }, 400);
  }

  const origin = new URL(request.url).origin;
  const items = [];
  for (const cartItem of body.cart) {
    const product = catalog[cartItem.productId as keyof typeof catalog];
    const size = textField(cartItem.size, 4).toLowerCase();
    const copies = Number(cartItem.quantity);
    if (
      !product ||
      !allowedSizes.has(size) ||
      !Number.isInteger(copies) ||
      copies < 1 ||
      copies > 5
    ) {
      return json({ error: 'Your bag contains an unavailable product, size, or quantity.' }, 400);
    }
    items.push({
      sku: SHIRT_SKU,
      copies,
      sizing: 'fillPrintArea',
      attributes: { color: product.color, size },
      assets: [{ printArea: 'front', url: `${origin}/print/${product.asset}` }],
    });
  }

  const recipient = body.recipient ?? {};
  const name = textField(recipient.name);
  const email = textField(recipient.email);
  const line1 = textField(recipient.line1);
  const townOrCity = textField(recipient.townOrCity);
  const stateOrCounty = textField(recipient.stateOrCounty, 60).toUpperCase();
  const postalOrZipCode = textField(recipient.postalOrZipCode, 20);
  const countryCode = textField(recipient.countryCode, 2).toUpperCase();

  if (
    !name ||
    !email.includes('@') ||
    !line1 ||
    !townOrCity ||
    !stateOrCounty ||
    !postalOrZipCode ||
    countryCode !== 'US'
  ) {
    return json({ error: 'Complete each US shipping field before placing the sandbox order.' }, 400);
  }

  const reference = `afterglow-${crypto.randomUUID()}`;
  const payload = {
    merchantReference: reference,
    idempotencyKey: reference,
    shippingMethod: 'Standard',
    recipient: {
      name,
      email,
      address: { line1, townOrCity, stateOrCounty, postalOrZipCode, countryCode },
    },
    items,
  };

  try {
    const prodigiResponse = await fetch(PRODIGI_ENDPOINT, {
      method: 'POST',
      headers: {
        'X-API-Key': process.env.PRODIGI_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const prodigi = (await prodigiResponse.json()) as {
      outcome?: string;
      order?: { id?: string };
      issues?: Array<{ description?: string }>;
    };

    if (!prodigiResponse.ok || !prodigi.order?.id) {
      const detail = prodigi.issues?.[0]?.description;
      return json({ error: detail || 'Prodigi could not accept this sandbox order.' }, 502);
    }

    return json({ orderId: prodigi.order.id, reference, outcome: prodigi.outcome });
  } catch {
    return json({ error: 'Prodigi is temporarily unreachable. Please try again.' }, 502);
  }
}
