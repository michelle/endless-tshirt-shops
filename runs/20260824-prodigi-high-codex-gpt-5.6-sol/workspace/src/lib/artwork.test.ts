import { beforeEach, describe, expect, it } from "vitest";
import { artworkSvg, createArtworkToken, readArtworkToken } from "./artwork";

describe("artwork tokens", () => {
  beforeEach(() => {
    process.env.ARTWORK_SIGNING_SECRET = "a-very-long-test-secret-that-is-never-used-live";
  });

  it("round-trips a signed timestamp", () => {
    const timestamp = "1724430300123";
    expect(readArtworkToken(createArtworkToken(timestamp))).toBe(timestamp);
  });

  it("rejects tampered timestamps and signatures", () => {
    const token = createArtworkToken("1724430300123");
    expect(readArtworkToken(token.replace("123", "124"))).toBeNull();
    expect(readArtworkToken(`${token}x`)).toBeNull();
  });

  it("creates a print-area-sized white timestamp graphic", () => {
    const svg = artworkSvg("1724430300123");
    expect(svg).toContain('width="4680"');
    expect(svg).toContain('height="5790"');
    expect(svg).toContain('fill="#ffffff"');
    expect(svg).toContain("1724430300123");
  });
});
