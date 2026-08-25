import { describe, expect, it, vi } from "vitest";
import { parseSelection, selectionFromMetadata } from "./catalog";

describe("catalog selection", () => {
  it("accepts a valid current selection", () => {
    vi.setSystemTime(new Date("2026-08-25T12:00:00Z"));
    expect(parseSelection({ fit: "unisex", size: "M", timestamp: Date.now() })).toEqual({ fit: "unisex", size: "M", timestamp: Date.now() });
    vi.useRealTimers();
  });

  it("rejects tampered selections", () => {
    expect(parseSelection({ fit: "child", size: "M", timestamp: Date.now() })).toBeNull();
    expect(parseSelection({ fit: "unisex", size: "5XL", timestamp: Date.now() })).toBeNull();
    expect(parseSelection({ fit: "unisex", size: "M", timestamp: 1 })).toBeNull();
  });

  it("round-trips trusted Stripe metadata", () => {
    expect(selectionFromMetadata({ fit: "fitted", size: "XL", timestamp: "1787691234567" })).toEqual({ fit: "fitted", size: "XL", timestamp: 1787691234567 });
  });
});
