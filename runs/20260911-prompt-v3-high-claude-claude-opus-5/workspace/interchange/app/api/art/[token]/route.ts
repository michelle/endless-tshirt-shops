import { NextRequest } from "next/server";
import sharp from "sharp";
import { readArtToken } from "@/lib/art";
import { renderBack, renderFront, atPixelSize } from "@/lib/render";
import { sanitizeSpec } from "@/lib/spec";

export const runtime = "nodejs";
export const maxDuration = 60;

/** 15.6in x 19.3in print area at 300 DPI. */
const PRINT_PX = { w: 4680, h: 5790 };
const SCREEN_PX = { w: 900, h: 1114 };

export async function GET(req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token: raw } = await ctx.params;
  const token = raw.replace(/\.(png|svg)$/i, "");
  const payload = readArtToken(token);
  if (!payload) return new Response("Unknown or tampered artwork reference", { status: 404 });

  const spec = sanitizeSpec(payload.s);
  const svg = payload.side === "back" ? renderBack(spec) : renderFront(spec);

  if (raw.toLowerCase().endsWith(".svg")) {
    return new Response(svg, {
      headers: { "content-type": "image/svg+xml", "cache-control": "public, max-age=31536000, immutable" },
    });
  }

  // `?screen=1` serves a lightweight version for order pages / emails.
  const px = req.nextUrl.searchParams.get("screen") ? SCREEN_PX : PRINT_PX;
  const png = await sharp(Buffer.from(atPixelSize(svg, px.w, px.h)), { limitInputPixels: false })
    .png({ compressionLevel: 6 })
    .toBuffer();

  return new Response(new Uint8Array(png), {
    headers: {
      "content-type": "image/png",
      "content-length": String(png.length),
      "cache-control": "public, max-age=31536000, immutable",
      "content-disposition": `inline; filename="interchange-${payload.side}.png"`,
    },
  });
}
