import { NextResponse } from "next/server";
import { COLORWAYS, type ColorwayId } from "@/lib/catalog";
import { isDialect, safeTimeZone } from "@/lib/dialects";
import { verify } from "@/lib/signing";
import { buildSvg, renderPng } from "@/print/render";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * The print file. Prodigi's printers fetch this URL directly, so it stays
 * public — but it only renders moments that were signed by this store.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const t = Number(url.searchParams.get("t"));
  const d = url.searchParams.get("d");
  const c = url.searchParams.get("c") as ColorwayId | null;
  const tz = safeTimeZone(url.searchParams.get("tz"));
  const sig = url.searchParams.get("sig");

  if (!Number.isFinite(t) || !isDialect(d) || !c || !(c in COLORWAYS)) {
    return NextResponse.json({ error: "bad artwork request" }, { status: 400 });
  }
  if (!verify(`${Math.trunc(t)}|${d}|${c}|${tz}`, sig)) {
    return NextResponse.json({ error: "bad signature" }, { status: 403 });
  }

  const requested = Number(url.searchParams.get("w"));
  const width = Number.isFinite(requested) ? Math.min(Math.max(requested, 320), 4680) : 4680;

  const spec = {
    dialect: d,
    epochMs: Math.trunc(t),
    timeZone: tz,
    ink: COLORWAYS[c].ink,
    width,
  };

  // `&fmt=svg` hands back the vector the raster is made from. Handy when you
  // want to check a print file rather than look at one.
  if (url.searchParams.get("fmt") === "svg") {
    return new NextResponse(buildSvg(spec).svg, {
      headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=31536000, immutable" },
    });
  }

  const png = await renderPng({
    dialect: d,
    epochMs: Math.trunc(t),
    timeZone: tz,
    ink: COLORWAYS[c].ink,
    width,
  });

  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Content-Length": String(png.byteLength),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
