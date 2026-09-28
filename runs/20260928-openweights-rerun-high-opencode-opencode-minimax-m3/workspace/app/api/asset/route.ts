// Serves the DTG print asset.
//
// Prodigi will fetch this URL after a successful Stripe payment. The route
// is also the same one we hit during the preview fetch, so what the
// customer sees is exactly what gets shipped. SKU: GLOBAL-TEE-BC-3001.
//
// Inputs come from URL query params (so the URL itself is the source of
// truth and we don't need a database).
//
// GET /api/asset?date=YYYY-MM-DD&lat=..&lon=..&title=..&place=..

import { NextResponse } from "next/server";
import { renderDesignPng } from "@/lib/renderer";
import { publicBaseUrl } from "@/lib/env";
import type { SkyInput } from "@/lib/design";

export const runtime = "nodejs"; // sharp is native
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
  if (!sky) {
    return NextResponse.json(
      {
        error:
          "Bad request: ?date=YYYY-MM-DD&lat=..&lon=..&title=..&place=.. are required.",
      },
      { status: 400 },
    );
  }
  try {
    const buf = await renderDesignPng(sky, publicBaseUrl(req));
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Content-Length": String(buf.byteLength),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "render failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
