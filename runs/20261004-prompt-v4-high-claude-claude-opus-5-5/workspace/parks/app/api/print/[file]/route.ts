import { decodeDesign, renderDesignSvg } from "@/lib/design";
import { svgToPng } from "@/lib/render";
import { verify } from "@/lib/sign";

export const maxDuration = 60;

// Full-resolution print file fetched by Prodigi: 3600×4500 transparent PNG.
export async function GET(req: Request, ctx: { params: Promise<{ file: string }> }) {
  const { file } = await ctx.params;
  const enc = file.replace(/\.png$/, "");
  const sig = new URL(req.url).searchParams.get("sig") || "";
  if (!verify(enc, sig)) return new Response("Invalid signature", { status: 403 });
  const r = decodeDesign(enc);
  if (!r.ok) return new Response(r.error, { status: 400 });
  const png = await svgToPng(renderDesignSvg(r.design));
  return new Response(new Uint8Array(png), {
    headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
