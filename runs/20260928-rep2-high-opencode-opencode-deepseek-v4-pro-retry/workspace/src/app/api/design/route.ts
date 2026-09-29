import { NextRequest } from "next/server";
import { buildStarMapSvg } from "@/lib/starmap";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function num(v: string | null, fallback: number): number {
  if (v === null || v === "") return fallback;
  const n = parseFloat(v);
  return Number.isNaN(n) ? fallback : n;
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const date = sp.get("date") || "";
  const time = sp.get("time") || undefined;
  const lat = num(sp.get("lat"), 0);
  const lng = num(sp.get("lng"), 0);
  const title = sp.get("title") || "The Night Sky";
  const names = sp.get("names") || "";
  const message = sp.get("message") || undefined;
  const locationLabel = sp.get("location") || "";
  const shirtColor = sp.get("color") || "black";
  const format = sp.get("format") || "svg";
  const width = Math.min(6000, Math.max(200, num(sp.get("w"), 1000)));

  if (!date) {
    return new Response("Missing date", { status: 400 });
  }

  const svg = buildStarMapSvg({
    date,
    time,
    lat,
    lng,
    title,
    names,
    message,
    locationLabel,
    shirtColor,
  });

  if (format === "png") {
    const { Resvg } = await import("@resvg/resvg-js");
    const resvg = new Resvg(svg, {
      fitTo: { mode: "width", value: width },
      background: "rgba(0,0,0,0)",
    });
    const png = resvg.render().asPng();
    return new Response(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=3600",
      },
    });
  }

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
