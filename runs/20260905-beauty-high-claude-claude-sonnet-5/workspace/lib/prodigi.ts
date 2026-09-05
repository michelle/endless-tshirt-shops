// Thin client for the Prodigi Print API (https://www.prodigi.com/print-api/).
// Replaces the original datetime.store fulfillment flow, which posted DTG
// jobs to Scalable Press. Prodigi's model is simpler: give it a public image
// URL + a SKU + a shipping address and it prints & ships on your behalf.

export type ProdigiAddress = {
  name: string;
  line1: string;
  line2?: string;
  townOrCity: string;
  stateOrCounty?: string;
  postalOrZipCode: string;
  countryCode: string;
  email?: string;
};

export type CreateProdigiOrderInput = {
  sku: string;
  color: string;
  size: string;
  artworkUrl: string;
  recipient: ProdigiAddress;
  idempotencyKey: string;
};

export type ProdigiOrderResult = {
  ok: boolean;
  orderId?: string;
  status?: string;
  raw?: unknown;
  error?: string;
};

function apiBase() {
  return process.env.PRODIGI_API_BASE || 'https://api.sandbox.prodigi.com/v4.0';
}

export async function createProdigiOrder(
  input: CreateProdigiOrderInput
): Promise<ProdigiOrderResult> {
  const apiKey = process.env.PRODIGI_API_KEY;
  if (!apiKey) {
    return { ok: false, error: 'PRODIGI_API_KEY is not set' };
  }

  const body = {
    merchantReference: input.idempotencyKey,
    shippingMethod: 'Standard',
    recipient: {
      name: input.recipient.name,
      email: input.recipient.email,
      address: {
        line1: input.recipient.line1,
        line2: input.recipient.line2 || undefined,
        postalOrZipCode: input.recipient.postalOrZipCode,
        countryCode: input.recipient.countryCode,
        townOrCity: input.recipient.townOrCity,
        stateOrCounty: input.recipient.stateOrCounty || undefined,
      },
    },
    items: [
      {
        merchantReference: input.idempotencyKey,
        sku: input.sku,
        copies: 1,
        sizing: 'fillPrintArea',
        attributes: {
          color: input.color,
          size: input.size,
        },
        assets: [
          {
            printArea: 'front',
            url: input.artworkUrl,
          },
        ],
      },
    ],
  };

  try {
    const res = await fetch(`${apiBase()}/Orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify(body),
      // Idempotency isn't natively supported by Prodigi, so callers should
      // avoid calling this twice for the same session (see webhook handler).
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      return {
        ok: false,
        error: `Prodigi order create failed (${res.status}): ${JSON.stringify(json).slice(0, 400)}`,
        raw: json,
      };
    }

    const order = json.order;
    if (!order || (order.status && order.status.issues && order.status.issues.length)) {
      return {
        ok: false,
        error: `Prodigi rejected the order: ${JSON.stringify(json).slice(0, 400)}`,
        raw: json,
      };
    }

    return {
      ok: true,
      orderId: order.id,
      status: order.status?.stage,
      raw: json,
    };
  } catch (err: any) {
    return { ok: false, error: `Prodigi request threw: ${err?.message || err}` };
  }
}
