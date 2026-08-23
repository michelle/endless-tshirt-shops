import Stripe from 'stripe';

let client: Stripe | null = null;

export function stripe(): Stripe {
  if (!client) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY is not configured');
    client = new Stripe(key, {
      appInfo: { name: 'datetime.store', version: '1.0.0' },
      maxNetworkRetries: 2,
    });
  }
  return client;
}

/**
 * Everything we need to fulfil an order, carried on the PaymentIntent. Stripe is
 * the system of record here: there is no separate orders database, which keeps
 * the deployment stateless and means the Stripe dashboard is the source of
 * truth an operator can actually inspect.
 */
export type OrderMetadata = {
  /** Always {@link APP_TAG}. Marks the PaymentIntent as one of ours — see `isOurOrder`. */
  app: string;
  /** Scalable Press design ID (the uploaded artwork). */
  sp_design_id: string;
  /** Scalable Press order token from the pre-payment quote. Idempotency key for fulfilment. */
  sp_order_token: string;
  /** Set once the order is placed with Scalable Press. */
  sp_order_id?: string;
  /** `pending` until fulfilled, then `placed`, or `failed` if Scalable Press rejected it. */
  sp_status?: 'pending' | 'placed' | 'failed';
  sp_error?: string;
  /** Scalable Press wholesale total for this order, in USD, at quote time. */
  sp_cost_usd?: string;
  style: string;
  size: string;
  /** The Unix millisecond timestamp printed on the shirt. */
  shirt_timestamp: string;
};

export function readOrderMetadata(pi: Stripe.PaymentIntent): Partial<OrderMetadata> {
  return (pi.metadata ?? {}) as Partial<OrderMetadata>;
}

/** Stamped on every PaymentIntent we create. */
export const APP_TAG = 'datetime.store';

/**
 * Whether this PaymentIntent is one of ours.
 *
 * A Stripe account can host more than one application, and *every* webhook
 * endpoint on the account receives *every* event. Without this check we would
 * happily read another app's metadata and send its orders to our printer.
 */
export function isOurOrder(pi: Stripe.PaymentIntent): boolean {
  return readOrderMetadata(pi).app === APP_TAG;
}
