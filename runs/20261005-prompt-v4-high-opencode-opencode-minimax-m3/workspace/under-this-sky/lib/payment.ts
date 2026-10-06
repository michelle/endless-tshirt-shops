// lib/payment.ts
// Single façade for the two ways we can collect money:
//
//   1. Real Stripe Checkout (production-style path), wired up via
//      STRIPE_SECRET_KEY / STRIPE_PUBLISHABLE_KEY.  Completion lands
//      on /api/webhook as a checkout.session.completed event with a
//      signed Stripe-Signature header so we know it's genuine.
//
//   2. Local demo-pay emulator (no Stripe keys configured).  Creates
//      a "session" locally, returns a hosted-style URL pointing at
//      /api/demo-pay/<id>, and completes orders synchronously so
//      the design page can be tested without setting up Stripe.
//
// We never send an order to Prodigi from this module — that's
// /lib/fulfill.ts, called from the webhook (or directly from
// /api/demo-pay when keys are missing).

import Stripe from "stripe";
// crypto import no longer needed here (Stripe sessions provide ids)
// but kept in scope for the file's other consumers if they exist.

export interface PaymentItem {
  description: string;
  amountCents: number;
  quantity: number;
}

export interface PaymentSessionInput {
  items: PaymentItem[];
  successUrl: string;
  cancelUrl: string;
  currency: string;
  metadata: Record<string, string>;
}

export interface PaymentSession {
  id: string;
  url: string;
  payment_intent?: string;
}

export type PaymentMode = "stripe" | "demo";

export interface CreateSessionOptions {
  preferredMode?: PaymentMode;
}

export class PaymentClient {
  readonly mode: PaymentMode;
  private readonly stripeSecret?: string;
  private readonly stripe?: Stripe;

  constructor(opts: { stripeSecret?: string; forceMode?: PaymentMode }) {
    this.stripeSecret = opts.stripeSecret;
    if (opts.forceMode === "demo") {
      this.mode = "demo";
    } else if (this.stripeSecret && isLikelyStripeKey(this.stripeSecret)) {
      this.stripe = new Stripe(this.stripeSecret, { apiVersion: "2024-12-18.acacia" });
      this.mode = "stripe";
    } else {
      this.mode = "demo";
    }
  }

  async createSession(
    input: PaymentSessionInput
  ): Promise<PaymentSession> {
    if (this.mode === "stripe") {
      return this.stripeSession(input);
    }
    return this.demoSession(input);
  }

  private async stripeSession(
    input: PaymentSessionInput
  ): Promise<PaymentSession> {
    const line_items = input.items.map((it) => ({
      quantity: Math.max(1, it.quantity),
      price_data: {
        currency: input.currency.toLowerCase(),
        product_data: { name: it.description },
        unit_amount: it.amountCents,
      },
    }));
    const session = await this.stripe!.checkout.sessions.create({
      mode: "payment",
      line_items,
      success_url: `${input.successUrl}${encodeURIComponent("?")}`,
      cancel_url: input.cancelUrl,
      metadata: input.metadata,
      payment_intent_data: {
        metadata: input.metadata,
      },
      // Prodigi works USD-domiciled, so we lock the test session to USD.
      currency: input.currency.toLowerCase(),
      shipping_address_collection: {
        allowed_countries: ["US", "CA", "GB", "AU", "DE", "FR", "ES", "IT", "JP"],
      },
    });
    return {
      id: session.id,
      url: session.url!,
      payment_intent: (session.payment_intent as string) ?? undefined,
    };
  }

  private async demoSession(
    input: PaymentSessionInput
  ): Promise<PaymentSession> {
    // In demo mode we use the orderId as both session id and lookup key.
    // This makes /api/demo-pay/[id]/route.ts trivial to navigate.
    const orderId = input.metadata.orderId;
    if (!orderId) {
      throw new Error("demo session requires orderId in metadata");
    }
    return {
      id: `cs_demo_${orderId}`,
      url: `/api/demo-pay/${encodeURIComponent(orderId)}`,
    };
  }
}

export function isLikelyStripeKey(s: string): boolean {
  return /^sk_(?:test|live)_[A-Za-z0-9]{20,}/.test(s) ||
    /^rkcs_[A-Za-z0-9_]{20,}/.test(s);
}
