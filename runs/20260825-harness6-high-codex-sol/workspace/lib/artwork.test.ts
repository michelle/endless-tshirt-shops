import { beforeEach, describe, expect, it } from "vitest";
import { artworkSvg, createArtworkSignature, verifyArtworkSignature } from "./artwork";

describe("artwork signing", () => {
  beforeEach(() => { process.env.ARTWORK_SIGNING_SECRET = "test-secret-with-enough-entropy"; });
  it("signs and verifies an immutable timestamp", () => {
    const signature = createArtworkSignature("1780000000001");
    expect(verifyArtworkSignature("1780000000001", signature)).toBe(true);
    expect(verifyArtworkSignature("1780000000002", signature)).toBe(false);
  });
  it("only renders timestamp digits into artwork", () => {
    const svg = artworkSvg("123<script>").toString();
    expect(svg).toContain(">123</text>");
    expect(svg).not.toContain("script");
  });
});
