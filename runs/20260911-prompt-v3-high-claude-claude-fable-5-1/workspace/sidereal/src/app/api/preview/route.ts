import { NextRequest } from "next/server";
import { safeDecodeDesign } from "@/lib/design";
import { buildSkyMapSvg } from "@/lib/skymap";
import { renderPng } from "@/lib/render";

export const dynamic = "force-dynamic";

/**
 * GET /api/preview?d=<encoded design>            → SVG (transparent, for inline mockups)
 * GET /api/preview?d=<encoded design>&png=1&w=800 → PNG on the garment colour (for Stripe / sharing)
 * GET /api/preview?d=<encoded design>&png=1&t=1   → transparent PNG (for static mockups)
 */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const design = safeDecodeDesign(q.get("d"));
  if (!design) return new Response("Bad design", { status: 400 });

  if (q.get("png")) {
    const w = Math.min(2000, Math.max(200, Number(q.get("w") ?? 800) || 800));
    const png = renderPng(design, w, { transparent: q.get("t") === "1" });
    return new Response(new Uint8Array(png), {
      headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=31536000, immutable" },
    });
  }

  const svg = buildSkyMapSvg(design, { caption: true, transparent: true });
  return new Response(svg, {
    headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
