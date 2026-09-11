import { NextRequest } from "next/server";
import sharp from "sharp";
import { artworkSvg, decodeDesign } from "../../../lib/design";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const design = decodeDesign(request.nextUrl.searchParams.get("design"));
  const png = await sharp(Buffer.from(artworkSvg(design))).png().toBuffer();
  return new Response(new Uint8Array(png), { headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=300, s-maxage=86400" } });
}
