import { NextRequest } from "next/server";
import { decodeSpec } from "@/lib/spec";
import { generateCryptid } from "@/lib/genome";
import { plateSvg, printSvg, PLATE } from "@/lib/art/plate";
import { rasterize } from "@/lib/render";
import { PRINT_AREA, Ink } from "@/lib/catalog";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Deterministic artwork endpoint.
 *
 *  /api/art/bone/<token>.png            -> the print file Prodigi downloads
 *  /api/art/bone/<token>.png?w=640      -> a small preview (used for the
 *                                          Stripe Checkout product image)
 *
 * The token fully encodes the design, so the URL is stable forever and can be
 * cached hard. Nothing needs to be stored to reproduce a print file.
 */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ ink: string; token: string }> }
) {
  const { ink: inkParam, token: rawToken } = await ctx.params;

  const ink: Ink = inkParam === "coal" ? "coal" : "bone";
  const token = decodeURIComponent(rawToken).replace(/\.png$/i, "");
  const spec = decodeSpec(token);
  if (!spec) {
    return new Response("Unknown design", { status: 404 });
  }

  const cryptid = generateCryptid(spec);

  const wParam = req.nextUrl.searchParams.get("w");
  const bgParam = req.nextUrl.searchParams.get("bg");

  let svg: string;
  let width: number;

  if (wParam) {
    width = Math.min(1600, Math.max(160, Math.round(Number(wParam) || 640)));
    const bg = /^[0-9a-fA-F]{6}$/.test(bgParam ?? "") ? `#${bgParam}` : null;
    const plate = plateSvg(cryptid, ink, "pv");
    svg = bg
      ? plate.replace(
          /(<svg[^>]*>)/,
          `$1<rect width="${PLATE.w}" height="${PLATE.h}" fill="${bg}"/>`
        )
      : plate;
  } else {
    width = PRINT_AREA.width;
    svg = printSvg(cryptid, ink);
  }

  try {
    const png = rasterize(svg, width);
    return new Response(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        "Content-Length": String(png.length),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err) {
    console.error("[art] render failed", err);
    return new Response("Render failed", { status: 500 });
  }
}
