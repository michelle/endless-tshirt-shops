import { NextResponse } from "next/server";
import { verifyDesignToken } from "@/lib/token";
import { renderPreviewPng } from "@/lib/render";
import { findColor } from "@/lib/catalog";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Small preview on the shirt colour, for Stripe Checkout and the order page. */
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
  const png = renderPreviewPng(design, color.hex, color.dark);
  return new Response(new Uint8Array(png), {
    headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
