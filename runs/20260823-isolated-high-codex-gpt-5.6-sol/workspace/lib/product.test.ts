import { describe, expect, it } from "vitest";
import { orderSelectionSchema, SP_PRODUCTS, SP_SIZES } from "./product";

describe("product configuration", () => {
  it("accepts every sellable combination", () => {
    for (const style of Object.keys(SP_PRODUCTS)) for (const size of Object.keys(SP_SIZES)) {
      expect(orderSelectionSchema.parse({ style, size, capturedAt: 1_800_000_000_000 })).toBeTruthy();
    }
  });
  it("rejects tampered variants", () => {
    expect(() => orderSelectionSchema.parse({ style: "hoodie", size: "XXL", capturedAt: Date.now() })).toThrow();
  });
});
