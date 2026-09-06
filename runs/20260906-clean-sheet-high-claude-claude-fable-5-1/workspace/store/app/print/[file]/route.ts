import { NextResponse } from "next/server";
import { parsePrintFileName } from "@/lib/catalog";
import { renderPng } from "@/lib/render";

export const dynamic = "force-static";
export const revalidate = false;

/** Full-resolution, transparent-background print file. This is the URL Prodigi downloads. */
export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const spec = parsePrintFileName(file);
  if (!spec) return NextResponse.json({ error: "unknown print file" }, { status: 404 });
  const png = await renderPng({ status: spec.code, style: spec.style, ink: spec.ink });
  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Content-Length": String(png.length),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
