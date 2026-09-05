import { describe, expect, it } from "vitest";
import { artworkSvg, artworkUrl, renderArtworkPng, DESIGN_WIDTH_IN, DESIGN_TOP_IN } from "@/lib/artwork";
import { STYLES } from "@/lib/catalog";

describe("artwork", () => {
  it("builds an SVG the size of the print area with the timestamp 8in wide, 3in down", () => {
    const svg = artworkSvg({ timestamp: 1757036000000, style: "unisex" });
    const { width, height } = STYLES.unisex.printAreaPx;
    expect(svg).toContain(`width="${width}" height="${height}"`);
    expect(svg).toContain(">1757036000000<");
    const pxPerIn = width / STYLES.unisex.printAreaIn.width;
    expect(svg).toContain(`textLength="${DESIGN_WIDTH_IN * pxPerIn}"`);
    const y = Number(/ y="([\d.]+)"/.exec(svg)![1]);
    expect(y).toBeGreaterThan(DESIGN_TOP_IN * pxPerIn);
    expect(svg).not.toContain("<rect");
  });

  it("renders a PNG at print resolution", async () => {
    const png = await renderArtworkPng({ timestamp: 1757036000000, style: "fitted", scale: 0.1, background: "#000" });
    expect(png.subarray(0, 8)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    const w = png.readUInt32BE(16);
    const h = png.readUInt32BE(20);
    expect(w).toBe(Math.round(STYLES.fitted.printAreaPx.width * 0.1));
    expect(h).toBe(Math.round(STYLES.fitted.printAreaPx.height * 0.1));
  });

  it("produces stable artwork URLs", () => {
    expect(artworkUrl("https://datetime.store", "fitted", 42)).toBe("https://datetime.store/api/artwork/42.png?style=fitted");
  });
});
