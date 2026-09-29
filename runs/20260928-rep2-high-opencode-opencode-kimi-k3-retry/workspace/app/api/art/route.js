import { NextResponse } from "next/server";
import sharp from "sharp";
import { generateArt, ART_W, ART_H } from "../../../lib/art.js";
import { verifyArtParams } from "../../../lib/sign.js";
import { SHIRT_COLORS, SHIRT_SIZES, getPalette } from "../../../lib/palettes.js";

export const runtime = "nodejs";
export const maxDuration = 60;

const PRINT_W = 3120; // 15.6in @ 200dpi
const PRINT_H = 3860; // 19.3in @ 200dpi

export async function GET(req) {
  const { ok, w, p, c, s } = verifyArtParams(req.nextUrl.searchParams);
  if (!ok) return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  if (!w || !SHIRT_COLORS.includes(c) || !SHIRT_SIZES.includes(s) || !getPalette(p)) {
    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
  }

  const thumb = req.nextUrl.searchParams.get("thumb") === "1";
  const { svg } = generateArt(w, p);

  // density scales the SVG's viewBox up to print resolution; resize snaps to exact pixels.
  const density = Math.round(72 * (PRINT_W / ART_W) * 100) / 100;
  let img = sharp(Buffer.from(svg), { density, limitInputPixels: false });
  if (thumb) {
    img = img.resize(760, Math.round((760 * ART_H) / ART_W)).webp({ quality: 82 });
  } else {
    img = img.resize(PRINT_W, PRINT_H).png();
  }
  const buf = await img.toBuffer();

  return new Response(buf, {
    headers: {
      "Content-Type": thumb ? "image/webp" : "image/png",
      "Content-Length": String(buf.length),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
