import { NextRequest } from "next/server";
import { renderArtPng } from "@/lib/renderArt";
import { isPaletteId, isShirtColorId, sanitizePhrase } from "@/lib/types";

// Renders the print/preview PNG for a given phrase + palette + shirt color.
// Deterministic and pure: same query params -> byte-identical image, every
// time. Used as (a) the Stripe line-item thumbnail, (b) the Prodigi print
// asset URL, and (c) the order confirmation page preview.
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const phrase = sanitizePhrase(searchParams.get("phrase") ?? "");
  const paletteParam = searchParams.get("palette") ?? "signal";
  const shirtParam = searchParams.get("shirt") ?? "white";

  const paletteId = isPaletteId(paletteParam) ? paletteParam : "signal";
  const shirtColorId = isShirtColorId(shirtParam) ? shirtParam : "white";

  try {
    const png = await renderArtPng({ phrase, paletteId, shirtColorId });
    return new Response(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err) {
    console.error("art render failed", err);
    return new Response("failed to render art", { status: 500 });
  }
}
