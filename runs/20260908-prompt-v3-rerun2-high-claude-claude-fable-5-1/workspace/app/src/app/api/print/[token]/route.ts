import { NextRequest } from "next/server";
import { renderPrintPng } from "@/lib/render";
import { verifyDesignToken } from "@/lib/token";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Print-ready asset fetched by Prodigi: a 4665x5844 transparent PNG (the
 * full front print area at 300dpi). The token is HMAC-signed at fulfilment
 * time, so only designs from paid orders can be rendered at full size.
 */
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/print/[token]">) {
  const { token } = await ctx.params;
  const design = verifyDesignToken(token.replace(/\.png$/i, ""));
  if (!design) return new Response("Not found", { status: 404 });
  const png = renderPrintPng(design);
  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Content-Length": String(png.length),
      "Content-Disposition": 'inline; filename="under-these-stars-front.png"',
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
