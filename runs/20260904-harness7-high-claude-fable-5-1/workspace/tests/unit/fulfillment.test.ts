import { describe, expect, it } from "vitest";
import type Stripe from "stripe";
import { buildProdigiOrder, shirtSpecFromMetadata } from "@/lib/fulfillment";

const pi = {
  id: "pi_test123",
  receipt_email: "jenny@example.com",
  shipping: {
    name: "Jenny Rosen",
    phone: "+14155551234",
    address: { line1: "185 Berry St", line2: "Suite 550", city: "San Francisco", state: "CA", postal_code: "94107", country: "US" },
  },
  metadata: { style: "unisex", size: "L", timestamp: "1757036000000" },
} as unknown as Stripe.PaymentIntent;

describe("fulfillment", () => {
  it("reads the shirt spec from metadata and rejects garbage", () => {
    expect(shirtSpecFromMetadata(pi.metadata)).toEqual({ style: "unisex", size: "L", timestamp: 1757036000000 });
    expect(shirtSpecFromMetadata({ style: "unisex", size: "L", timestamp: "abc" })).toBeNull();
    expect(shirtSpecFromMetadata({})).toBeNull();
  });

  it("builds an idempotent Prodigi order from a paid PaymentIntent", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://datetime.store";
    const order = buildProdigiOrder(pi, { style: "unisex", size: "L", timestamp: 1757036000000 });
    expect(order.idempotencyKey).toBe("pi_test123");
    expect(order.merchantReference).toBe("pi_test123");
    expect(order.shippingMethod).toBe("Standard");
    expect(order.callbackUrl).toBe("https://datetime.store/api/webhooks/prodigi");
    expect(order.recipient).toEqual({
      name: "Jenny Rosen",
      email: "jenny@example.com",
      phoneNumber: "+14155551234",
      address: {
        line1: "185 Berry St",
        line2: "Suite 550",
        townOrCity: "San Francisco",
        stateOrCounty: "CA",
        postalOrZipCode: "94107",
        countryCode: "US",
      },
    });
    expect(order.items).toHaveLength(1);
    expect(order.items[0]).toMatchObject({
      sku: "GLOBAL-TEE-BC-3001",
      copies: 1,
      sizing: "fillPrintArea",
      attributes: { color: "black", size: "l" },
      assets: [{ printArea: "front", url: "https://datetime.store/api/artwork/1757036000000.png?style=unisex" }],
    });
  });

  it("refuses to build an order without a shipping address", () => {
    expect(() => buildProdigiOrder({ ...pi, shipping: null } as Stripe.PaymentIntent, { style: "unisex", size: "L", timestamp: 1 })).toThrow(/shipping/);
  });
});

describe("fulfillment country policy", () => {
  it("refuses to fulfil outside SHIP_COUNTRIES", () => {
    process.env.SHIP_COUNTRIES = "US";
    const gb = { ...pi, shipping: { ...pi.shipping, address: { ...pi.shipping!.address, country: "GB" } } } as Stripe.PaymentIntent;
    expect(() => buildProdigiOrder(gb, { style: "unisex", size: "L", timestamp: 1 })).toThrow(/SHIP_COUNTRIES/);
  });
});
