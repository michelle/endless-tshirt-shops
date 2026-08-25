import { serverEnv } from './env';
import { GARMENTS, prodigiSize, type Size, type Style } from './catalog';

export type ProdigiRecipient = {
  name: string;
  email?: string;
  phoneNumber?: string;
  address: {
    line1: string;
    line2?: string;
    postalOrZipCode: string;
    countryCode: string;
    townOrCity: string;
    stateOrCounty?: string;
  };
};

export type ProdigiOrder = {
  id: string;
  created: string;
  status: {
    stage: string;
    issues: Array<{ objectId?: string; errorCode?: string; description?: string }>;
    details?: Record<string, string>;
  };
  shipments?: Array<{
    carrier?: { name?: string; service?: string };
    tracking?: { number?: string; url?: string };
    status?: string;
  }>;
  items?: Array<{ thumbnailUrl?: string | null; sku?: string; status?: string }>;
  charges?: Array<{ totalCost?: { amount: string; currency: string } }>;
};

class ProdigiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: unknown,
  ) {
    super(message);
    this.name = 'ProdigiError';
  }
}

async function prodigiFetch<T>(
  path: string,
  init: RequestInit & { idempotencyKey?: string } = {},
): Promise<T> {
  const { idempotencyKey, ...rest } = init;
  const res = await fetch(`${serverEnv.prodigiBaseUrl()}${path}`, {
    ...rest,
    headers: {
      'X-API-Key': serverEnv.prodigiApiKey(),
      'Content-Type': 'application/json',
      ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
      ...rest.headers,
    },
    cache: 'no-store',
  });

  const text = await res.text();
  let body: unknown;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = text;
  }

  if (!res.ok) {
    const detail =
      typeof body === 'object' && body !== null
        ? JSON.stringify(body).slice(0, 500)
        : String(body).slice(0, 500);
    throw new ProdigiError(`Prodigi ${path} failed (${res.status}): ${detail}`, res.status, body);
  }
  return body as T;
}

export type CreateOrderInput = {
  /** Stripe PaymentIntent id — used as merchant reference and idempotency key. */
  paymentIntentId: string;
  timestamp: number;
  style: Style;
  size: Size;
  /** Publicly fetchable PNG of the print-ready artwork. */
  artworkUrl: string;
  recipient: ProdigiRecipient;
};

/**
 * Submits the order to Prodigi for print-on-demand fulfilment.
 *
 * The artwork is generated at the exact aspect ratio of the garment's front
 * print area, so `fitPrintArea` places the timestamp where we intend without
 * Prodigi having to guess at scaling.
 */
export async function createProdigiOrder(
  input: CreateOrderInput,
): Promise<ProdigiOrder> {
  const garment = GARMENTS[input.style];

  const payload = {
    merchantReference: input.paymentIntentId,
    shippingMethod: 'Standard',
    idempotencyKey: input.paymentIntentId,
    recipient: input.recipient,
    metadata: {
      timestamp: String(input.timestamp),
      style: input.style,
      size: input.size,
      paymentIntent: input.paymentIntentId,
    },
    items: [
      {
        merchantReference: `datetime-tee-${input.timestamp}`,
        sku: garment.sku,
        copies: 1,
        sizing: 'fitPrintArea',
        attributes: {
          color: garment.color,
          size: prodigiSize(input.size),
        },
        assets: [{ printArea: 'front', url: input.artworkUrl }],
      },
    ],
  };

  const result = await prodigiFetch<{ outcome: string; order: ProdigiOrder }>(
    '/Orders',
    {
      method: 'POST',
      body: JSON.stringify(payload),
      idempotencyKey: input.paymentIntentId,
    },
  );

  // Prodigi returns 200 with a non-Ok outcome for validation problems such as an
  // unfulfillable address, so the HTTP status alone is not enough.
  const outcome = result.outcome?.toLowerCase();
  if (outcome !== 'created' && outcome !== 'createdwithissues' && outcome !== 'ok') {
    throw new ProdigiError(
      `Prodigi rejected the order: ${result.outcome}`,
      200,
      result,
    );
  }
  return result.order;
}

export async function getProdigiOrder(id: string): Promise<ProdigiOrder | null> {
  try {
    const result = await prodigiFetch<{ order: ProdigiOrder }>(`/Orders/${id}`);
    return result.order ?? null;
  } catch (err) {
    if (err instanceof ProdigiError && err.status === 404) return null;
    throw err;
  }
}

/** Shapes a Stripe shipping address into Prodigi's recipient format. */
export function toProdigiRecipient(
  shipping: {
    name?: string | null;
    phone?: string | null;
    address?: {
      line1?: string | null;
      line2?: string | null;
      city?: string | null;
      state?: string | null;
      postal_code?: string | null;
      country?: string | null;
    } | null;
  },
  email?: string | null,
): ProdigiRecipient {
  const address = shipping.address ?? {};
  if (!shipping.name || !address.line1 || !address.postal_code || !address.country) {
    throw new Error('Shipping address from Stripe is incomplete');
  }
  return {
    name: shipping.name,
    ...(email ? { email } : {}),
    ...(shipping.phone ? { phoneNumber: shipping.phone } : {}),
    address: {
      line1: address.line1,
      ...(address.line2 ? { line2: address.line2 } : {}),
      postalOrZipCode: address.postal_code,
      countryCode: address.country,
      townOrCity: address.city || '',
      ...(address.state ? { stateOrCounty: address.state } : {}),
    },
  };
}
