import { NextRequest } from "next/server";
import { safeDecodeDesign } from "@/lib/design";
import { renderPng } from "@/lib/render";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** GET /api/print?d=<encoded design> → the exact print-ready PNG (4680 x 5790, transparent). */
export async function GET(req: NextRequest) {
  const design = safeDecodeDesign(req.nextUrl.searchParams.get("d"));
  if (!design) return new Response("Bad design", { status: 400 });
  const png = renderPng(design);
  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `inline; filename="sidereal-print.png"`,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
