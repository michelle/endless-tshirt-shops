import { decodeDesign, renderBadgeSvg } from "@/lib/design";

// Live preview for the designer: tight crop of the badge as SVG.
export async function GET(req: Request) {
  const d = new URL(req.url).searchParams.get("d") || "";
  const r = decodeDesign(d);
  if (!r.ok) return Response.json({ error: r.error }, { status: 400 });
  return new Response(renderBadgeSvg(r.design, 1000), {
    headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
