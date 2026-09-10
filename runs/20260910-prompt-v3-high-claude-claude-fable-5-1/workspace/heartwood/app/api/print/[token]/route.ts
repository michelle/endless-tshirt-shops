import { NextResponse } from "next/server";
import { verifyDesignToken } from "@/lib/token";
import { renderPrintPng } from "@/lib/render";
import { findColor } from "@/lib/catalog";

export const runtime = "nodejs";
export const maxDuration = 120;

/** Print-ready PNG (4665x5844 @ 300dpi, transparent). This is the URL Prodigi downloads. */
export async function GET(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const url = new URL(req.url);
  const color = findColor(url.searchParams.get("c") ?? "black") ?? findColor("black")!;
  let design;
  try {
    design = verifyDesignToken(decodeURIComponent(token.replace(/\.png$/i, "")));
  } catch {
    return NextResponse.json({ error: "Invalid or unsigned design token" }, { status: 403 });
  }
  const png = renderPrintPng(design, color.dark);
  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Content-Length": String(png.length),
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Disposition": `inline; filename="heartwood-print.png"`,
    },
  });
}
