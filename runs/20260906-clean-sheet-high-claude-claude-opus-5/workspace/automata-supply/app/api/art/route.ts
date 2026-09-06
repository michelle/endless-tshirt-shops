import { NextRequest } from "next/server";
import { designFromParams } from "@/lib/design";
import { renderDesign, previewLayout, bareLayout } from "@/lib/render";

export const runtime = "nodejs";

const MIN_W = 120;
const MAX_W = 1400;

/** Browser-facing preview of a design. Same renderer as the print asset. */
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const design = designFromParams(params);

  const wRaw = Number(params.get("w") ?? 900);
  const width = Number.isFinite(wRaw)
    ? Math.min(MAX_W, Math.max(MIN_W, Math.round(wRaw)))
    : 900;

  // `bare` drops the print-area padding and caption, for icons and thumbnails.
  const layout = params.get("bare") === "1" ? bareLayout(width) : previewLayout(width);

  // `bg` flattens the transparent ground, for surfaces that composite onto
  // white (Stripe Checkout line-item images, link previews).
  const bg = /^[0-9a-fA-F]{6}$/.test(params.get("bg") ?? "") ? params.get("bg")! : null;
  if (bg) {
    layout.background = [
      parseInt(bg.slice(0, 2), 16),
      parseInt(bg.slice(2, 4), 16),
      parseInt(bg.slice(4, 6), 16),
    ];
  }

  const png = renderDesign(design, layout);

  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      // Designs are pure functions of the query string, so they cache forever.
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
