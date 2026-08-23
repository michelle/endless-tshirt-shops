import { describe, expect, it } from 'vitest';
import type Stripe from 'stripe';
import { APP_TAG, isOurOrder, readOrderMetadata } from '@/lib/stripe';

const pi = (metadata: Record<string, string> | null) =>
  ({ id: 'pi_1', metadata } as unknown as Stripe.PaymentIntent);

describe('isOurOrder', () => {
  it('accepts a PaymentIntent we stamped', () => {
    expect(isOurOrder(pi({ app: APP_TAG, sp_order_token: 'order_abc' }))).toBe(true);
  });

  it('rejects another application sharing the Stripe account', () => {
    // The hazard is real: every webhook endpoint on an account receives every
    // event, and a foreign app may use the same metadata key names.
    expect(isOurOrder(pi({ app: 'some-other-shop', sp_order_token: 'order_abc' }))).toBe(false);
  });

  it('rejects an untagged PaymentIntent even if it looks like an order', () => {
    expect(isOurOrder(pi({ sp_order_token: 'order_abc', sp_design_id: 'design_1' }))).toBe(false);
  });

  it('rejects a PaymentIntent with no metadata at all', () => {
    expect(isOurOrder(pi(null))).toBe(false);
  });
});

describe('readOrderMetadata', () => {
  it('returns an empty object rather than throwing on null metadata', () => {
    expect(readOrderMetadata(pi(null))).toEqual({});
  });
});
