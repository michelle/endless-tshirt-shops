import { describe, expect, it } from "vitest";
import { orderOptionsSchema } from "./validation";

describe("orderOptionsSchema", () => {
  it("accepts a valid product configuration", () => {
    expect(orderOptionsSchema.parse({ style: "unisex", size: "M", timestamp: 1_787_000_000_000 })).toEqual({ style: "unisex", size: "M", timestamp: 1_787_000_000_000 });
  });
  it("rejects client-side price or arbitrary variants", () => {
    expect(orderOptionsSchema.safeParse({ style: "hoodie", size: "XXL", timestamp: 1, price: 1 }).success).toBe(false);
  });
});
