import sharp from "sharp";
import { makePrintSvg, readArtToken } from "../../../lib/design";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  const design = token ? readArtToken(token) : null;
  if (!design) return new Response("Not found", { status: 404 });
  const png = await sharp(Buffer.from(makePrintSvg(design))).png().toBuffer();
  return new Response(new Uint8Array(png), { headers: { "content-type": "image/png", "cache-control": "public, max-age=31536000, immutable" } });
}
