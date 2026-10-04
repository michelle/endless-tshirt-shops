import { NextResponse } from "next/server";
import { decodeDesign } from "@/lib/design";
import { renderDesignPng } from "@/lib/render";
import { verifyDesign } from "@/lib/sign";
import { PRINT_WIDTH_PX } from "@/lib/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * GET /api/art?d=<design>&sig=<hmac>[&w=900][&bg=1]
 * Renders the design to PNG. Without `w` this is the print-ready file
 * (4665 x 5844 px, transparent) that Prodigi downloads.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const d = url.searchParams.get("d") ?? "";
  if (!d || !verifyDesign(d, url.searchParams.get("sig"))) {
    return NextResponse.json({ error: "invalid or unsigned design" }, { status: 403 });
  }
  const wRaw = Number(url.searchParams.get("w"));
  const width = Number.isFinite(wRaw) && wRaw > 0 ? Math.min(PRINT_WIDTH_PX, Math.max(200, Math.round(wRaw))) : undefined;
  const background = url.searchParams.get("bg") === "1";
  let png: Buffer;
  try {
    png = renderDesignPng(decodeDesign(d), { width, background });
  } catch (e) {
    console.error("render failed", e);
    return NextResponse.json({ error: "render failed", detail: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Content-Length": String(png.length),
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Disposition": `inline; filename="orbital-${width ? "preview" : "print"}.png"`,
    },
  });
}
