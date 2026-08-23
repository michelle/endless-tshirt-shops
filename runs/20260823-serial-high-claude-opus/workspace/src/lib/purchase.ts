import type { ShirtSize, ShirtStyle } from './catalog';

/** Shared client-side types for talking to /api/checkout. */

export type PurchaseAddress = {
  name: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  zip: string;
  country: 'US';
  phone?: string;
};

export type PurchaseRequest = {
  timestampMs: number;
  style: ShirtStyle;
  size: ShirtSize;
  email: string;
  address: PurchaseAddress;
  paymentIntentId?: string;
};

export type PurchaseIssue = { code?: string; path?: string; message?: string };

export type PurchasePrepared = {
  clientSecret: string;
  paymentIntentId: string;
  printerAvailable: boolean;
  testMode: boolean;
};

export class PurchaseError extends Error {
  readonly issues: PurchaseIssue[];
  readonly code?: string;

  constructor(message: string, issues: PurchaseIssue[] = [], code?: string) {
    super(message);
    this.name = 'PurchaseError';
    this.issues = issues;
    this.code = code;
  }
}

export async function preparePurchase(body: PurchaseRequest): Promise<PurchasePrepared> {
  const res = await fetch('/api/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });

  const payload = (await res.json().catch(() => ({}))) as {
    error?: { message?: string; code?: string };
    issues?: PurchaseIssue[];
    clientSecret?: string;
    paymentIntentId?: string;
    printerAvailable?: boolean;
    testMode?: boolean;
  };

  if (!res.ok || !payload.clientSecret || !payload.paymentIntentId) {
    throw new PurchaseError(
      payload.error?.message ?? 'We could not start checkout. Please try again.',
      payload.issues ?? [],
      payload.error?.code,
    );
  }

  return {
    clientSecret: payload.clientSecret,
    paymentIntentId: payload.paymentIntentId,
    printerAvailable: payload.printerAvailable !== false,
    testMode: payload.testMode === true,
  };
}

/** Where Stripe should send the customer back to after a redirect payment. */
export function orderReturnUrl(): string {
  return `${window.location.origin}/order`;
}

export function orderPath(paymentIntentId: string, clientSecret: string): string {
  const params = new URLSearchParams({
    payment_intent: paymentIntentId,
    payment_intent_client_secret: clientSecret,
  });
  return `/order?${params.toString()}`;
}
