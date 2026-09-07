import { createHmac, timingSafeEqual } from "node:crypto";
import { artworkSigningSecret } from "./env";
import type { Fit, Size } from "./catalog";

export function artworkPayload(timestamp: number, fit: Fit, size: Size) {
  return `${timestamp}:${fit}:${size}`;
}

export function signArtwork(timestamp: number, fit: Fit, size: Size) {
  return createHmac("sha256", artworkSigningSecret())
    .update(artworkPayload(timestamp, fit, size))
    .digest("hex");
}

export function isValidArtworkSignature(timestamp: number, fit: Fit, size: Size, signature: string) {
  if (!/^[a-f0-9]{64}$/.test(signature)) return false;
  const expected = Buffer.from(signArtwork(timestamp, fit, size), "hex");
  const provided = Buffer.from(signature, "hex");
  return expected.length === provided.length && timingSafeEqual(expected, provided);
}
