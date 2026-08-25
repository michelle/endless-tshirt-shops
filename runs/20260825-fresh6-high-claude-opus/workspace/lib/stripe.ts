import Stripe from 'stripe';
import { serverEnv } from './env';
import type { Size, Style } from './catalog';

let cached: Stripe | null = null;

export function stripe(): Stripe {
  if (!cached) {
    cached = new Stripe(serverEnv.stripeSecretKey(), {
      apiVersion: '2025-01-27.acacia',
      appInfo: { name: 'datetime.store', version: '1.0.0' },
      maxNetworkRetries: 2,
    });
  }
  return cached;
}

/**
 * The PaymentIntent is the order record. Everything fulfilment needs lives in
 * its metadata, which keeps the app stateless — no database to run or migrate,
 * and Stripe stays the single source of truth for what was bought and paid for.
 */
export type OrderMetadata = {
  timestamp: string;
  style: Style;
  size: Size;
  artwork_url: string;
  /** Written back by the webhook once Prodigi accepts the order. */
  prodigi_order_id?: string;
  prodigi_status?: 'created' | 'failed';
  prodigi_error?: string;
};

export function readOrderMetadata(
  metadata: Stripe.Metadata,
): OrderMetadata | null {
  const { timestamp, style, size, artwork_url } = metadata;
  if (!timestamp || !style || !size || !artwork_url) return null;
  return metadata as unknown as OrderMetadata;
}
