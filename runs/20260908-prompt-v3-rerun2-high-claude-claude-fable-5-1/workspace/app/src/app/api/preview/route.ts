import path from "node:path";
import { NextRequest } from "next/server";
import { Resvg } from "@resvg/resvg-js";
import { SHIRT_COLORS } from "@/lib/design";
import { starMapSvg } from "@/lib/starmap";
import { parsePreviewToken } from "@/lib/preview-token";

export const dynamic = "force-dynamic";

const FONT_DIR = path.join(process.cwd(), "public", "fonts");
const FONT_FILES = ["Marcellus-Regular.ttf", "Lato-Light.ttf", "Lato-Regular.ttf", "Lato-Bold.ttf"].map((f) =>
  path.join(FONT_DIR, f),
);

/** Small PNG preview of the artwork on a garment-coloured background. */
export async function GET(req: NextRequest) {
  const design = parsePreviewToken(req.nextUrl.searchParams.get("d") ?? "");
  if (!design) return new Response("Not found", { status: 404 });
  const bg = SHIRT_COLORS.find((c) => c.key === design.color)?.hex ?? "#141414";
  const svg = starMapSvg(design, { fullCanvas: false, id: "pv" });
  const png = new Resvg(svg, {
    fitTo: { mode: "width", value: 800 },
    background: bg,
    font: { fontFiles: FONT_FILES, loadSystemFonts: false, defaultFontFamily: "Lato" },
  })
    .render()
    .asPng();
  return new Response(Buffer.from(png), {
    headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
