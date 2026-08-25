import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";
import { buildProdigiOrder, createProdigiOrder, type ProdigiOrderPayload } from "./prodigi";

describe("Prodigi order mapping", () => {
  beforeEach(() => { process.env.ARTWORK_SIGNING_SECRET = "test-secret-with-enough-entropy"; });
  afterEach(() => vi.restoreAllMocks());
  it("maps a paid Checkout Session to a fitted garment order", () => {
    const session = {
      id: "cs_test_123",
      metadata: { timestamp: "1780000000001", style: "fitted", size: "M" },
      customer_details: { email: "buyer@example.com", address: null },
      collected_information: { shipping_details: { name: "Test Buyer", address: { line1: "1 Test St", line2: null, city: "San Francisco", state: "CA", postal_code: "94107", country: "US" } } },
    } as unknown as Stripe.Checkout.Session;
    const order = buildProdigiOrder(session, "https://datetime.example");
    expect(order.idempotencyKey).toBe("cs_test_123");
    expect(order.items[0].sku).toBe("GLOBAL-TEE-BC-6004");
    expect(order.items[0].attributes).toEqual({ color: "black", size: "m" });
    expect(order.items[0].assets[0].url).toMatch(/^https:\/\/datetime\.example\/api\/artwork\?timestamp=1780000000001&sig=[a-f0-9]{64}$/);
  });

  it("treats an idempotent AlreadyExists response as successful", async () => {
    process.env.PRODIGI_API_KEY = "sandbox-key";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      outcome: "AlreadyExists",
      order: { id: "ord_existing" },
    }), { status: 200, headers: { "Content-Type": "application/json" } })));
    const order = await createProdigiOrder({ idempotencyKey: "cs_test_existing" } as ProdigiOrderPayload);
    expect(order.id).toBe("ord_existing");
  });
});
