import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { createTimestampArtwork } from "./scalable-press";

describe("timestamp artwork", () => {
  it("renders a transparent print-ready PNG", async () => {
    const png = await createTimestampArtwork("1800000000000");
    const metadata = await sharp(png).metadata();
    expect(metadata.format).toBe("png");
    expect(metadata.width).toBe(2400);
    expect(metadata.height).toBe(900);
    expect(png.length).toBeGreaterThan(10_000);
  });
});
