import { describe, expect, it } from "vitest";
import type Stripe from "stripe";
import { buildProdigiOrder } from "@/lib/fulfillment";
import { prodigi } from "@/lib/prodigi";

/**
 * Talks to the real Prodigi sandbox. Runs only when PRODIGI_API_KEY is set and
 * RUN_INTEGRATION=1, e.g.
 *   RUN_INTEGRATION=1 NEXT_PUBLIC_SITE_URL=https://<deployment> npx vitest run tests/integration
 */
const enabled = process.env.RUN_INTEGRATION === "1" && Boolean(process.env.PRODIGI_API_KEY);

describe.skipIf(!enabled)("prodigi sandbox", () => {
  it("accepts the order we build for a paid PaymentIntent, and the same key returns the same order", async () => {
    const timestamp = Date.now();
    const pi = {
      id: `pi_integration_${timestamp}`,
      receipt_email: "jenny.rosen@example.com",
      shipping: {
        name: "Jenny Rosen",
        phone: null,
        address: { line1: "185 Berry St", line2: "Suite 550", city: "San Francisco", state: "CA", postal_code: "94107", country: "US" },
      },
      metadata: { style: "fitted", size: "M", timestamp: String(timestamp) },
    } as unknown as Stripe.PaymentIntent;

    const order = buildProdigiOrder(pi, { style: "fitted", size: "M", timestamp });
    const first = await prodigi.createOrder(order);
    expect(["Created", "CreatedWithIssues", "OnHold"]).toContain(first.outcome);
    expect(first.order.id).toMatch(/^ord_/);
    expect(first.order.merchantReference).toBe(pi.id);
    console.log("prodigi order", first.order.id, first.outcome, JSON.stringify(first.order.status));

    const second = await prodigi.createOrder(order);
    expect(second.order.id).toBe(first.order.id);

    const fetched = await prodigi.getOrder(first.order.id);
    expect(fetched.order.id).toBe(first.order.id);
    const item = (fetched.order.items as { sku: string; attributes: Record<string, string>; assets: { url: string }[] }[])[0];
    expect(item.sku).toBe("GLOBAL-TEE-BC-6004");
    expect(item.attributes).toMatchObject({ color: "black", size: "m" });
    expect(item.assets[0].url).toContain(`/api/artwork/${timestamp}.png?style=fitted`);
  }, 60_000);
});
