import { SHIRT_COLORS } from "@/lib/catalog";
import { decodeDesign } from "@/lib/design";
import { mockupSvg } from "@/lib/mockup";
import { svgToPng } from "@/lib/render";

// Shirt mockup PNG (used as the product image on Stripe Checkout).
export async function GET(req: Request, ctx: { params: Promise<{ file: string }> }) {
  const { file } = await ctx.params;
  const r = decodeDesign(file.replace(/\.png$/, ""));
  if (!r.ok) return new Response(r.error, { status: 400 });
  const c = new URL(req.url).searchParams.get("c");
  const color = SHIRT_COLORS.find((s) => s.id === c) ?? SHIRT_COLORS[0];
  const png = await svgToPng(mockupSvg(r.design, color.hex, 800));
  return new Response(new Uint8Array(png), {
    headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
