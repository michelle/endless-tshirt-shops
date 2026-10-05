import { buildSvg } from "@/lib/design";
import { svgToPng } from "@/lib/raster";
import { decodeDesign } from "@/lib/schema";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Print-ready PNG for Prodigi (and small previews for the storefront). The
 * full-resolution asset is generated from the same SVG the customer previews.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("d") ?? "";
  const width = Number(url.searchParams.get("w") ?? 0);
  try {
    const design = decodeDesign(token);
    const svg = buildSvg(design);
    const png = await svgToPng(svg, url.origin, width);
    return new Response(Buffer.from(png), {
      headers: {
        "content-type": "image/png",
        "cache-control": "public, max-age=31536000, immutable",
        "content-disposition": width > 0 ? "inline" : `inline; filename="aster-${design.palette}.png"`,
      },
    });
  } catch (error) {
    return new Response(`Artwork unavailable: ${(error as Error).message}`, { status: 500 });
  }
}
