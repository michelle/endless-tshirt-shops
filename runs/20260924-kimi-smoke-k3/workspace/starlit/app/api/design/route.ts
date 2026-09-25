// Renders the signed, personalized star-map design as a print-ready PNG.
// This is the artwork URL handed to Prodigi; the HMAC token makes each
// design immutable and unguessable, so it can be cached forever.

import { NextRequest, NextResponse } from "next/server";
import { Resvg } from "@resvg/resvg-js";
import { buildStarMapSVG, type SkyConfig } from "@/lib/starmap";
import { pathTextRenderer } from "@/lib/textpath";
import { verifyToken } from "@/lib/order";

export const runtime = "nodejs";
export const maxDuration = 60;

// Bella+Canvas 3001 front print area per Prodigi product data
const PRINT_W = 4680;
const PRINT_H = 5790;

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("p");
  if (!token) {
    return NextResponse.json({ error: "missing design token" }, { status: 400 });
  }
  const cfg = verifyToken<SkyConfig>(token);
  if (!cfg || typeof cfg.lat !== "number" || typeof cfg.lng !== "number") {
    return NextResponse.json({ error: "invalid design token" }, { status: 403 });
  }
  try {
    // Optional downscale for on-screen previews (print uses full size).
    const wParam = Number(req.nextUrl.searchParams.get("w"));
    const width =
      isFinite(wParam) && wParam >= 200 && wParam <= PRINT_W
        ? Math.round(wParam)
        : PRINT_W;
    const svg = buildStarMapSVG(cfg, pathTextRenderer);
    if (svg.includes("NaN")) throw new Error("SVG generation produced NaN");
    const resvg = new Resvg(svg, {
      fitTo: { mode: "width", value: width },
      background: "rgba(0,0,0,0)",
    });
    const png = resvg.render().asPng();
    return new NextResponse(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: "render failed", detail: String(e) },
      { status: 500 }
    );
  }
}
