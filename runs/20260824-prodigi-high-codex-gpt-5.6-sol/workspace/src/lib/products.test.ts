import { describe, expect, it } from "vitest";
import { checkoutInputSchema, shirtConfig } from "./products";

describe("catalog", () => {
  it("maps both cuts to Prodigi global apparel SKUs", () => {
    expect(shirtConfig.fitted.prodigiSku).toBe("GLOBAL-TEE-BC-6004");
    expect(shirtConfig.unisex.prodigiSku).toBe("GLOBAL-TEE-BC-3001");
  });

  it("accepts only supported variants and 13-digit timestamps", () => {
    expect(checkoutInputSchema.safeParse({ style: "fitted", size: "M", timestamp: "1724430300123" }).success).toBe(true);
    expect(checkoutInputSchema.safeParse({ style: "tank", size: "XXL", timestamp: "now" }).success).toBe(false);
  });
});
