import { describe, expect, it } from "vitest";
import { createDesign, createQuote } from "./scalable-press";

const run = process.env.RUN_SP_INTEGRATION === "1" && Boolean(process.env.SP_AUTH);

describe.skipIf(!run)("Scalable Press test integration", () => {
  it("creates print artwork and an order-ready quote without placing an order", async () => {
    const timestamp = String(Date.now());
    const designId = await createDesign(timestamp);
    expect(designId).toBeTruthy();
    const quote = await createQuote({
      designId,
      style: "unisex",
      size: "M",
      shipping: {
        name: "datetime.store Test",
        line1: "510 Townsend St",
        line2: null,
        city: "San Francisco",
        state: "CA",
        postal_code: "94103",
        country: "US",
      },
    });
    expect(quote.orderToken).toBeTruthy();
  }, 40_000);
});
