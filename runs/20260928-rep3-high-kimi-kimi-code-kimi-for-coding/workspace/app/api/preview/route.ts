// Shirt mockup preview for the configurator + Stripe line-item image.
// Accepts raw (unsigned) params — renders only a picture, so tampering is harmless.
import { buildDesignSvg } from "@/lib/design";
import { renderSvgToPng } from "@/lib/render";
import { buildShirtSvg, SHIRT_COLORS } from "@/lib/preview";
import { DARK_SHIRT_COLORS } from "@/lib/design-input";
import { validateDesign } from "@/lib/design-input";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const raw = {
    label: q.get("label") ?? "Somewhere on Earth",
    lat: Number(q.get("lat")),
    lon: Number(q.get("lon")),
    ms: Number(q.get("ms")),
    tz: q.get("tz") ?? "UTC",
    caption: q.get("caption") ?? undefined,
    color: q.get("color") ?? "black",
    size: q.get("size") ?? "m",
  };
  if (!Number.isFinite(raw.lat) || !Number.isFinite(raw.lon) || !Number.isFinite(raw.ms)) {
    return new Response("Missing or invalid preview parameters.", { status: 400 });
  }
  const v = validateDesign(raw);
  const d = v.ok ? v.value : { ...raw, label: "Somewhere on Earth", caption: undefined, tz: "UTC", color: "black", size: "m" } as any;
  const color = SHIRT_COLORS.find((c) => c.prodigi === d.color) ?? SHIRT_COLORS[0];

  const svg = buildDesignSvg({
    placeLabel: d.label,
    lat: d.lat,
    lon: d.lon,
    timeMs: d.ms,
    tz: d.tz,
    caption: d.caption,
    dark: DARK_SHIRT_COLORS.has(color.prodigi),
  });
  const artworkScale = 0.22;
  const artwork = renderSvgToPng(svg, artworkScale).toString("base64");
  const shirtSvg = buildShirtSvg(artwork, color.hex);
  const png = renderSvgToPng(shirtSvg, 1, "#f4f3f0");
  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, s-maxage=300, max-age=300",
    },
  });
}
