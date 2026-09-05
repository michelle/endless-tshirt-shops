import { NextRequest } from "next/server";
import { renderArtwork } from "@/lib/artwork";
import { parseDesignKey } from "@/lib/products";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * GET /api/artwork/{style}-{timestamp}.png[?scale=0.25]
 * Deterministic print-ready PNG for a design; Prodigi downloads this URL.
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ design: string }> }) {
  const { design: raw } = await ctx.params;
  const design = parseDesignKey(raw.replace(/\.png$/i, ""));
  if (!design) return new Response("Not found", { status: 404 });
  const scaleParam = Number(req.nextUrl.searchParams.get("scale") ?? "1");
  const scale = Number.isFinite(scaleParam) && scaleParam > 0 && scaleParam <= 1 ? scaleParam : 1;
  return renderArtwork(design, { scale });
}
