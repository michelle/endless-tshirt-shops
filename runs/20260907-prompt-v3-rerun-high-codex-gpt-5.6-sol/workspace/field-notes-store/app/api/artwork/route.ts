import sharp from "sharp";
import { isValidArtworkSignature, makePrintSvg, parseDesign } from "@/lib/design";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const payload = url.searchParams.get("payload") || "";
    const signature = url.searchParams.get("sig") || "";
    const secret = process.env.ARTWORK_SIGNING_SECRET;
    if (!secret || !payload || !signature || !isValidArtworkSignature(payload, signature, secret)) {
      return new Response("Invalid artwork signature", { status: 403 });
    }
    const design = parseDesign(JSON.parse(Buffer.from(payload, "base64url").toString("utf8")));
    const png = await sharp(Buffer.from(makePrintSvg(design))).png({ compressionLevel: 9 }).toBuffer();
    return new Response(new Uint8Array(png), {
      headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=31536000, immutable" },
    });
  } catch {
    return new Response("Artwork could not be rendered", { status: 400 });
  }
}
