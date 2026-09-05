import { createHmac, timingSafeEqual } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import * as opentype from "opentype.js";
import sharp from "sharp";
import { COLORS } from "./catalog";
import { siteUrl } from "./stripe";
export const ART_VERSION = "1";
function secret() {
  if (!process.env.ARTWORK_SIGNING_SECRET)
    throw new Error("Artwork signing is not configured");
  return process.env.ARTWORK_SIGNING_SECRET;
}
export function signArtwork(timestamp: string, color: string) {
  return createHmac("sha256", secret())
    .update(`${ART_VERSION}:${timestamp}:${color}`)
    .digest("hex");
}
export function validArtworkSignature(
  timestamp: string,
  color: string,
  signature: string,
) {
  if (
    !/^\d{13}$/.test(timestamp) ||
    !COLORS.some((c) => c.id === color) ||
    !/^[a-f0-9]{64}$/.test(signature)
  )
    return false;
  return timingSafeEqual(
    Buffer.from(signArtwork(timestamp, color), "hex"),
    Buffer.from(signature, "hex"),
  );
}
export function artworkUrl(timestamp: string, color: string) {
  return `${siteUrl()}/api/artwork?v=${ART_VERSION}&t=${timestamp}&c=${color}&sig=${signArtwork(timestamp, color)}`;
}
let fontPromise: Promise<opentype.Font> | undefined;
async function font() {
  return (fontPromise ??= readFile(
    path.join(process.cwd(), "public/fonts/font-0.ttf"),
  ).then((b) =>
    opentype.parse(
      b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer,
    ),
  ));
}
export async function renderArtwork(timestamp: string, color: string) {
  if (!/^\d{13}$/.test(timestamp)) throw new Error("Invalid timestamp");
  const ink = COLORS.find((c) => c.id === color)?.ink;
  if (!ink) throw new Error("Invalid color");
  const face = await font();
  // An 8-inch (2400px at 300dpi) inscription within Prodigi's US front print area.
  // Outlined glyphs embed the exact storefront font without relying on installed server fonts.
  const fontSize = 2400 / face.getAdvanceWidth(timestamp, 1);
  const outline = face.getPath(timestamp, (4665 - 2400) / 2, 1060, fontSize);
  outline.fill = ink;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="4665" height="5844" viewBox="0 0 4665 5844">${outline.toSVG(3)}</svg>`;
  return sharp(Buffer.from(svg))
    .png()
    .withMetadata({ density: 300 })
    .toBuffer();
}
