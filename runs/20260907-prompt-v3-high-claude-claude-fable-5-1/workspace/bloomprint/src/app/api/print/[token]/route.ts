import { NextRequest, NextResponse } from "next/server";
import { verifyDesignToken } from "@/lib/signing";
import { toPlantInput } from "@/lib/design";
import { renderPlantPng, PRINT_WIDTH, PREVIEW_WIDTH } from "@/lib/render";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Renders a design to PNG. The token is HMAC-signed by the server, so only
 * designs that went through checkout (or the preview endpoint) can be rendered
 * at print resolution. Prodigi downloads the full-size asset from here.
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const design = verifyDesignToken(token.replace(/\.png$/i, ""));
  if (!design) return NextResponse.json({ error: "Invalid asset token" }, { status: 404 });

  const size = req.nextUrl.searchParams.get("size");
  const width = size === "preview" ? PREVIEW_WIDTH : PRINT_WIDTH;
  const png = renderPlantPng(toPlantInput(design), width);

  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Content-Length": String(png.length),
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Disposition": `inline; filename="bloomprint-${design.name.replace(/[^a-z0-9]/gi, "-").toLowerCase()}.png"`,
    },
  });
}
