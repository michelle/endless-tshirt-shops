import { describe, expect, it } from "vitest";
import { PRODUCT, PRODUCTS, SIZES } from "./product";

describe("product contract", () => {
  it("keeps the reference price and supported variants", () => {
    expect(PRODUCT.price).toBe(2250);
    expect(PRODUCTS).toEqual({ fitted: "gildan-ladies-missy-t-shirt", unisex: "next-level-fitted-crew" });
    expect(SIZES).toEqual({ S: "sml", M: "med", L: "lrg", XL: "xlg" });
  });
});
