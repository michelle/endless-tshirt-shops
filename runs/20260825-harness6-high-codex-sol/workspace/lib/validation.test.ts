import { describe, expect, it } from "vitest";
import { checkoutSchema } from "./validation";

describe("checkoutSchema", () => {
  it("accepts a valid shirt configuration", () => {
    expect(checkoutSchema.parse({ timestamp: 1_780_000_000_001, style: "fitted", size: "M" })).toEqual({ timestamp: 1_780_000_000_001, style: "fitted", size: "M" });
  });
  it("rejects unsupported variants and extra fields", () => {
    expect(checkoutSchema.safeParse({ timestamp: Date.now(), style: "hoodie", size: "XXL" }).success).toBe(false);
    expect(checkoutSchema.safeParse({ timestamp: Date.now(), style: "unisex", size: "L", price: 1 }).success).toBe(false);
  });
  it("requires the 13-digit millisecond format used by the print asset", () => {
    expect(checkoutSchema.safeParse({ timestamp: 123, style: "fitted", size: "M" }).success).toBe(false);
  });
});
