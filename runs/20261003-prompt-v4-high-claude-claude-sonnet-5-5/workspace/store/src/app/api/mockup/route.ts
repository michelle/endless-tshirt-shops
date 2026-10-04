import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { designFromParam } from "@/lib/design";
import { renderMockupSvg } from "@/lib/sky";

export const maxDuration = 30;

// Deterministic in its input, so responses are immutable and CDN-cacheable.
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const design = designFromParam(p.get("d"));
  if (!design) return new NextResponse("Invalid design", { status: 400 });
  const svg = renderMockupSvg(design, { background: p.get("bg") === "1" });
  const headers = { "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable" };
  if (p.get("fmt") === "png") {
    const w = Math.min(1200, Math.max(200, Number(p.get("w")) || 800));
    const png = await sharp(Buffer.from(svg), { density: 72 }).resize(w).png().toBuffer();
    return new NextResponse(new Uint8Array(png), { headers: { ...headers, "Content-Type": "image/png" } });
  }
  return new NextResponse(svg, { headers: { ...headers, "Content-Type": "image/svg+xml" } });
}
