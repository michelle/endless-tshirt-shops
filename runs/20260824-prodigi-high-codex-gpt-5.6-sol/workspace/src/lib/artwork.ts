import { createHmac, timingSafeEqual } from "crypto";
import { artworkSigningSecret } from "@/lib/env";

function signature(timestamp: string): string {
  return createHmac("sha256", artworkSigningSecret())
    .update(`datetime-artwork:${timestamp}`)
    .digest("base64url");
}

export function createArtworkToken(timestamp: string): string {
  if (!/^\d{13}$/.test(timestamp)) throw new Error("Invalid artwork timestamp");
  return `${timestamp}.${signature(timestamp)}`;
}

export function readArtworkToken(token: string): string | null {
  const [timestamp, suppliedSignature, ...rest] = token.split(".");
  if (rest.length || !timestamp || !suppliedSignature || !/^\d{13}$/.test(timestamp)) {
    return null;
  }

  const expected = Buffer.from(signature(timestamp));
  const supplied = Buffer.from(suppliedSignature);
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) {
    return null;
  }
  return timestamp;
}

export function artworkSvg(timestamp: string): string {
  const escaped = timestamp.replace(/[^0-9]/g, "");
  return `
    <svg width="4680" height="5790" viewBox="0 0 4680 5790" xmlns="http://www.w3.org/2000/svg">
      <rect width="4680" height="5790" fill="none" />
      <text x="2340" y="850" text-anchor="middle" dominant-baseline="middle"
        fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="430"
        font-weight="600" letter-spacing="12">${escaped}</text>
    </svg>`;
}
