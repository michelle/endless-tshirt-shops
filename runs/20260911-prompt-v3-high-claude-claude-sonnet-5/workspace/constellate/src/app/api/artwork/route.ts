import { NextRequest } from "next/server";
import sharp from "sharp";
import { buildConstellationData, decodeDesignParams, renderConstellationSVG, VIEW_W, VIEW_H } from "@/lib/constellation";

export const runtime = "nodejs";

// Renders the same deterministic artwork the customer previewed in the
// browser. Used both for the on-page live preview (format=svg) and as the
// publicly-fetchable print-ready file we hand to Prodigi (format=png).
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const input = decodeDesignParams(searchParams);

  if (!input.title.trim() || !input.dateLabel.trim()) {
    return new Response("Missing required design fields", { status: 400 });
  }

  const data = buildConstellationData(input);
  const svg = renderConstellationSVG(input, data);

  const format = searchParams.get("format") || "svg";

  if (format === "svg") {
    return new Response(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  }

  // Print resolution: Prodigi's front print area for this SKU is ~4665x5844px
  // (300dpi). We render at the same 4:5 aspect ratio, scaled down slightly to
  // keep function payloads/time reasonable while staying print-sharp.
  const scale = 3;
  const width = VIEW_W * scale;
  const height = VIEW_H * scale;

  const png = await sharp(Buffer.from(svg), { density: 300 })
    .resize(width, height)
    .png()
    .toBuffer();

  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
