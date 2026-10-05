import sharp from "sharp";
import { verifyToken } from "../../../../lib/spec.js";
import { renderDesignSVG } from "../../../../lib/starmap.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(_req, context) {
  const { token } = await context.params;
  try {
    const spec = verifyToken(decodeURIComponent(token));
    const svg = renderDesignSVG(spec);
    const png = await sharp(Buffer.from(svg)).png({ compressionLevel: 8 }).toBuffer();
    return new Response(png, {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": 'inline; filename="meridian-star-map.png"',
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err) {
    return new Response("Artwork not found", { status: 404 });
  }
}
