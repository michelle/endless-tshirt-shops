import { describe, expect, it } from "vitest";
import {
  PRICE_CENTS,
  checkoutRequestSchema,
  formatMoney,
  prodigiSize,
  timestampIsCurrent,
  TIMESTAMP_SKEW_MS,
} from "@/lib/catalog";

describe("catalog", () => {
  it("prices the shirt at $22.50", () => {
    expect(formatMoney(PRICE_CENTS)).toBe("$22.50");
  });

  it("accepts timestamps within the skew window only", () => {
    const now = 1_757_036_000_000;
    expect(timestampIsCurrent(now, now)).toBe(true);
    expect(timestampIsCurrent(now - TIMESTAMP_SKEW_MS, now)).toBe(true);
    expect(timestampIsCurrent(now - TIMESTAMP_SKEW_MS - 1, now)).toBe(false);
    expect(timestampIsCurrent(now + TIMESTAMP_SKEW_MS + 1, now)).toBe(false);
  });

  it("validates checkout requests", () => {
    expect(checkoutRequestSchema.safeParse({ style: "fitted", size: "M", timestamp: 1 }).success).toBe(true);
    expect(checkoutRequestSchema.safeParse({ style: "vneck", size: "M", timestamp: 1 }).success).toBe(false);
    expect(checkoutRequestSchema.safeParse({ style: "fitted", size: "XXL", timestamp: 1 }).success).toBe(false);
    expect(checkoutRequestSchema.safeParse({ style: "fitted", size: "M", timestamp: 1.5 }).success).toBe(false);
    expect(checkoutRequestSchema.safeParse({ style: "fitted", size: "M", timestamp: "now" }).success).toBe(false);
  });

  it("maps sizes to Prodigi attribute values", () => {
    expect(prodigiSize("XL")).toBe("xl");
  });
});
