import { NextResponse } from "next/server";
import { renderArtworkPng } from "@/lib/artwork";
import { STYLE_IDS, type StyleId } from "@/lib/catalog";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * GET /api/artwork/<timestamp>.png?style=unisex[&preview=1]
 *
 * Print-ready artwork at the garment's full print-area resolution (Prodigi
 * downloads this), or a small opaque preview when `preview=1`.
 */
export async function GET(req: Request, ctx: { params: Promise<{ timestamp: string }> }) {
  const { timestamp: raw } = await ctx.params;
  const url = new URL(req.url);
  const ts = Number(raw.replace(/\.png$/i, ""));
  const style = (url.searchParams.get("style") ?? "unisex") as StyleId;
  if (!Number.isInteger(ts) || ts <= 0 || ts > 9_999_999_999_999 || !STYLE_IDS.includes(style)) {
    return NextResponse.json({ error: "bad artwork request" }, { status: 400 });
  }
  const preview = url.searchParams.get("preview") === "1";
  try {
    const png = await renderArtworkPng({
      timestamp: ts,
      style,
      scale: preview ? 0.12 : 1,
      background: preview ? "#000000" : null,
    });
    return new NextResponse(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        "Content-Length": String(png.length),
        "Content-Disposition": `inline; filename="datetime-${ts}.png"`,
        // Deterministic content: cache forever at the edge and in browsers.
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err) {
    console.error("[artwork] render failed", err);
    return NextResponse.json({ error: "render failed" }, { status: 500 });
  }
}
