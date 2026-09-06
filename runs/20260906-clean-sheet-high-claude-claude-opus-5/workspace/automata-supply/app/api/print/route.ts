import { NextRequest } from "next/server";
import { designFromParams } from "@/lib/design";
import { renderDesign, PRINT_LAYOUT } from "@/lib/render";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * The print-ready asset. Prodigi fetches this URL directly when the order is
 * put into production, so it must stay publicly reachable and deterministic
 * for the lifetime of the order.
 */
export async function GET(req: NextRequest) {
  const design = designFromParams(req.nextUrl.searchParams);
  const png = renderDesign(design, PRINT_LAYOUT);

  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `inline; filename="rule-${design.rule}-${design.seed}.png"`,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
