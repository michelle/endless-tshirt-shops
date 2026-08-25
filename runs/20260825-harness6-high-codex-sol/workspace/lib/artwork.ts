import { createHmac, timingSafeEqual } from "node:crypto";

function signingSecret() {
  const secret = process.env.ARTWORK_SIGNING_SECRET;
  if (!secret) throw new Error("ARTWORK_SIGNING_SECRET is not configured");
  return secret;
}

export function createArtworkSignature(timestamp: string | number) {
  return createHmac("sha256", signingSecret()).update(String(timestamp)).digest("hex");
}

export function verifyArtworkSignature(timestamp: string, signature: string) {
  if (!/^[a-f0-9]{64}$/.test(signature)) return false;
  const expected = Buffer.from(createArtworkSignature(timestamp), "hex");
  const actual = Buffer.from(signature, "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function artworkSvg(timestamp: string) {
  const escaped = timestamp.replace(/[^0-9]/g, "");
  return Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="3600" height="1200" viewBox="0 0 3600 1200">
      <rect width="3600" height="1200" fill="none"/>
      <text x="1800" y="600" dominant-baseline="middle" text-anchor="middle"
        font-family="Arial, Helvetica, sans-serif" font-size="420" font-weight="700"
        letter-spacing="12" fill="#ffffff">${escaped}</text>
    </svg>
  `);
}
