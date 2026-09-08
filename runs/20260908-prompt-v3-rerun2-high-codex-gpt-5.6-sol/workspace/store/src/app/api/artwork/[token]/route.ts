import sharp from "sharp";
import { artworkSvg } from "@/lib/print-artwork";
import { readDesignToken } from "@/lib/token";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(_request: Request, context: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await context.params;
    const design = readDesignToken(token);
    const png = await sharp(Buffer.from(artworkSvg(design))).png({ compressionLevel: 9 }).toBuffer();
    return new Response(new Uint8Array(png), { headers: { "Content-Type": "image/png", "Content-Disposition": "inline; filename=signal-atlas.png", "Cache-Control": "public, max-age=31536000, immutable" } });
  } catch {
    return new Response("Artwork not found", { status: 404 });
  }
}
