import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { buildStarMapSVG } from "@/lib/starmap";
import { verifyDesign } from "@/lib/tokens";
import { isDarkShirt } from "@/lib/design";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

/** Print-ready 300 DPI PNG for Prodigi. Token is HMAC-signed. */
export async function GET(
  _req: NextRequest,
  { params }: { params: { token: string } }
) {
  const token = decodeURIComponent(params.token).replace(/\.png$/i, "");
  const design = verifyDesign(token);
  if (!design) {
    return NextResponse.json({ error: "Invalid art token" }, { status: 403 });
  }
  const svg = buildStarMapSVG(design, { darkShirt: isDarkShirt(design.color) });
  const png = await sharp(Buffer.from(svg), { density: 72 })
    .png({ compressionLevel: 6 })
    .toBuffer();
  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}
