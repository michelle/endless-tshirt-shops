import { NextRequest, NextResponse } from "next/server";
import { decodeDesign, PRODUCT } from "@/lib/design";
import { withPngDpi } from "@/lib/png";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * GET /api/art/<token>.png?w=<px>&bg=1
 *
 * Renders the design encoded in <token> to a PNG. With no `w` parameter the
 * output is the exact Prodigi front print area (4680 x 5790 px, 300 DPI,
 * transparent background) – this is the URL handed to Prodigi as the print asset.
 * Smaller widths (with optional shirt-colour background) are used for previews.
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token: raw } = await ctx.params;
  const token = raw.replace(/\.(png|svg)$/i, "");
  const wantSvg = /\.svg$/i.test(raw);

  let design;
  try {
    design = decodeDesign(token);
  } catch {
    return NextResponse.json({ error: "Invalid design token" }, { status: 400 });
  }

  const sp = req.nextUrl.searchParams;
  const bg = sp.get("bg") === "1";
  const wParam = Number(sp.get("w"));
  const full = !wParam || wParam >= PRODUCT.printPx.w;
  const w = full ? PRODUCT.printPx.w : Math.max(64, Math.round(wParam));
  const h = full ? PRODUCT.printPx.h : Math.round((w * PRODUCT.printPx.h) / PRODUCT.printPx.w);

  // Lazy imports so that any load-time failure surfaces as a JSON error rather than an opaque 500.
  let svg: string;
  try {
    const { buildDesignSVG } = await import("@/lib/render");
    svg = buildDesignSVG(design, { background: bg, pixelSize: { w, h } });
  } catch (e) {
    console.error("svg build failed", e);
    return NextResponse.json({ error: "Design build failed", detail: (e as Error).stack ?? String(e) }, { status: 500 });
  }
  if (wantSvg) {
    return new NextResponse(svg, {
      headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=31536000, immutable" },
    });
  }

  let png: Buffer;
  try {
    const { svgToPng } = await import("@/lib/raster");
    png = withPngDpi(await svgToPng(svg, { dpi: 300 }), 300);
  } catch (e) {
    console.error("render failed", e);
    return NextResponse.json({ error: "Render failed", detail: (e as Error).stack ?? String(e) }, { status: 500 });
  }
  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Content-Length": String(png.length),
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Disposition": `inline; filename="orbitday-${design.date}.png"`,
    },
  });
}
