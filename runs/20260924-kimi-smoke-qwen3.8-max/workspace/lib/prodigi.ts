/**
 * Minimal Prodigi Print API v4 client (server-only).
 * https://www.prodigi.com/print-api/docs/reference/
 */
import type { OrderPayload } from './orders';

const BASE_URL =
  process.env.PRODIGI_ENV === 'live'
    ? 'https://api.prodigi.com/v4.0'
    : 'https://api.sandbox.prodigi.com/v4.0';

export const PRODIGI_SKU = 'GLOBAL-TEE-BC-3001'; // Bella + Canvas 3001, DTG
export const PRINT_AREA = 'front';

export type ProdigiResult = {
  ok: boolean;
  prodigiOrderId?: string;
  outcome?: string;
  issues?: unknown;
  error?: string;
};

export function serverBaseUrl(): string {
  if (process.env.PUBLIC_BASE_URL) return process.env.PUBLIC_BASE_URL.replace(/\/$/, '');
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return `http://localhost:${process.env.PORT || 3000}`;
}

export async function createProdigiOrder(order: OrderPayload, artworkUrl: string): Promise<ProdigiResult> {
  const apiKey = process.env.PRODIGI_API_KEY;
  if (!apiKey) return { ok: false, error: 'PRODIGI_API_KEY is not configured' };

  const body = {
    merchantReference: order.orderId,
    idempotencyKey: order.orderId, // Prodigi de-dupes replays for us
    shippingMethod: 'Standard',
    callbackUrl: `${serverBaseUrl()}/api/webhooks/prodigi`,
    recipient: {
      name: order.shipping.name,
      email: order.shipping.email,
      ...(order.shipping.phone ? { phoneNumber: order.shipping.phone } : {}),
      address: {
        line1: order.shipping.line1,
        ...(order.shipping.line2 ? { line2: order.shipping.line2 } : {}),
        postalOrZipCode: order.shipping.zip,
        countryCode: order.shipping.country,
        townOrCity: order.shipping.city,
        ...(order.shipping.state ? { stateOrCounty: order.shipping.state } : {}),
      },
    },
    items: [
      {
        merchantReference: `${order.orderId}-1`,
        sku: PRODIGI_SKU,
        copies: order.product.qty,
        sizing: 'fitPrintArea',
        attributes: {
          color: order.product.color,
          size: order.product.size,
        },
        recipientCost: {
          amount: (order.pricing.unitCents / 100).toFixed(2),
          currency: order.pricing.currency.toUpperCase(),
        },
        assets: [{ printArea: PRINT_AREA, url: artworkUrl }],
      },
    ],
    metadata: {
      orderId: order.orderId,
      label: order.design.label,
      palette: order.design.palette,
      radiusKm: String(order.design.radiusKm),
    },
  };

  try {
    const res = await fetch(`${BASE_URL}/Orders`, {
      method: 'POST',
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(45000),
    });
    const data = (await res.json()) as {
      outcome?: string;
      order?: { id?: string };
      issues?: unknown;
    };
    const outcome = data.outcome ?? '';
    const ok =
      res.ok &&
      ['Created', 'OnHold', 'CreatedWithIssues', 'AlreadyExists'].includes(outcome);
    return {
      ok,
      outcome,
      prodigiOrderId: data.order?.id,
      issues: data.issues,
      error: ok ? undefined : `Prodigi ${res.status}: ${outcome || 'request failed'}`,
    };
  } catch (e) {
    return { ok: false, error: `Prodigi request failed: ${(e as Error).message}` };
  }
}
