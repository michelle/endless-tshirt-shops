import { NextResponse } from "next/server";
import { decodeDesign } from "@/lib/design";
import { renderPng } from "@/lib/render";
import { teeColor } from "@/lib/catalog";

export const runtime = "nodejs";

/** Preview PNG for a design encoded in `d` (used for Stripe line-item images and sharing). */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const design = decodeDesign(url.searchParams.get("d"));
  const w = Math.min(1600, Math.max(200, Number(url.searchParams.get("w")) || 900));
  const withBg = url.searchParams.get("bg") === "1";
  try {
    const png = renderPng(design, w, withBg ? teeColor(design.tee).hex : undefined);
    return new NextResponse(new Uint8Array(png), {
      headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=31536000, immutable" },
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "render failed" }, { status: 500 });
  }
}
