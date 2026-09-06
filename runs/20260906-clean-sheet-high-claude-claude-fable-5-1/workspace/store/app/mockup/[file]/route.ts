import { NextResponse } from "next/server";
import { parseMockupFileName } from "@/lib/catalog";
import { renderPng } from "@/lib/render";

export const dynamic = "force-static";
export const revalidate = false;

/** Small preview on a shirt-coloured background, used for Stripe Checkout product images and social cards. */
export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const spec = parseMockupFileName(file);
  if (!spec) return NextResponse.json({ error: "unknown mockup" }, { status: 404 });
  const png = await renderPng({ status: spec.code, style: spec.style, ink: spec.color.ink, background: spec.color.hex, width: 800 });
  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Content-Length": String(png.length),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
