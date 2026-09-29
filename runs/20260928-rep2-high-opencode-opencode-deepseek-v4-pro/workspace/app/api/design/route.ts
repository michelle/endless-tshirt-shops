import { NextRequest, NextResponse } from "next/server";
import { renderStarMapPng } from "@/lib/render";
import { parseDesignQuery } from "@/lib/design";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Renders the deterministic star-map PNG for a given set of design params.
// Prodigi fetches this URL to obtain the print-ready asset.
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const p = parseDesignQuery(q);

  if (!p.date || !p.title) {
    return NextResponse.json({ error: "Missing design params" }, { status: 400 });
  }

  const png = renderStarMapPng({
    params: {
      date: p.date,
      lat: p.lat,
      lng: p.lng,
      title: p.title,
      locationName: p.locationName,
      ink: p.ink,
    },
  });

  return new NextResponse(png, {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
