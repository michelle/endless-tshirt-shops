// Full-resolution artwork PNG. This is the asset URL handed to Prodigi for DTG
// printing, so it requires a valid signed token.
import { verifyDesign } from "@/lib/token";
import { buildDesignSvg } from "@/lib/design";
import { renderSvgToPng } from "@/lib/render";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { token: string } }) {
  const token = decodeURIComponent(params.token).replace(/\.png$/, "");
  const d = verifyDesign(token);
  if (!d) {
    return new Response("Invalid or tampered design token.", { status: 403 });
  }
  const svg = buildDesignSvg({
    placeLabel: d.label,
    lat: d.lat,
    lon: d.lon,
    timeMs: d.ms,
    tz: d.tz,
    caption: d.caption,
    dark: d.dark,
  });
  const png = renderSvgToPng(svg, 1);
  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, s-maxage=31536000, max-age=3600, immutable",
    },
  });
}
