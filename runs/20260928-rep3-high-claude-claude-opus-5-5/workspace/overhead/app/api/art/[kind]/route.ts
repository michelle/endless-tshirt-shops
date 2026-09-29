import { NextRequest } from "next/server";
import { renderArtSVG, renderMockupSVG } from "@/lib/render";
import { svgToPng } from "@/lib/rasterize";
import { verifyArtParams } from "@/lib/server/sign";

export const runtime = "nodejs";
export const maxDuration = 60;

// Renders signed artwork URLs:
//   /api/art/print  — full-resolution transparent PNG sent to Prodigi for DTG printing
//   /api/art/mockup — shirt mockup thumbnail shown in Stripe Checkout
export async function GET(req: NextRequest, ctx: RouteContext<"/api/art/[kind]">) {
  const { kind } = await ctx.params;
  if (kind !== "print" && kind !== "mockup") return new Response("Not found", { status: 404 });
  const q = req.nextUrl.searchParams;
  const design = verifyArtParams(kind, q.get("d"), q.get("s"));
  if (!design) return new Response("Invalid or expired art link", { status: 403 });

  const png =
    kind === "print"
      ? svgToPng(renderArtSVG(design), 4680)
      : svgToPng(renderMockupSVG(design, "m"), 800);

  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      // Content-addressed by the signed design payload, so it never changes.
      "Cache-Control": "public, max-age=31536000, immutable",
      ...(kind === "print" ? { "Content-Disposition": 'inline; filename="overhead-print.png"' } : {}),
    },
  });
}
