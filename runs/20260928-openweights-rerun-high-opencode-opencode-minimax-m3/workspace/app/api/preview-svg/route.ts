// Returns the SVG preview for the live on-screen preview. Cheaper to render
// than a PNG and still pixel-perfect on the client.

import { NextResponse } from "next/server";

import { renderDesignSvg } from "@/lib/renderer";
import { publicBaseUrl } from "@/lib/env";
import type { SkyInput } from "@/lib/design";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function readSky(req: Request): SkyInput | null {
  const url = new URL(req.url);
  const date = url.searchParams.get("date") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const lat = Number(url.searchParams.get("lat"));
  const lon = Number(url.searchParams.get("lon"));
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) return null;
  if (!Number.isFinite(lon) || lon < -180 || lon > 180) return null;
  const title = (url.searchParams.get("title") ?? "").trim();
  if (title.length === 0 || title.length > 80) return null;
  const placeRaw = url.searchParams.get("place") ?? "";
  const place = placeRaw.trim().length > 0 ? placeRaw.slice(0, 80) : undefined;
  return {
    date,
    lat: Math.round(lat * 100) / 100,
    lon: Math.round(lon * 100) / 100,
    title,
    place,
  };
}

export async function GET(req: Request) {
  const sky = readSky(req);
  if (!sky) return NextResponse.json({ error: "bad params" }, { status: 400 });
  const svg = await renderDesignSvg(sky, publicBaseUrl(req));
  return new NextResponse(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}
