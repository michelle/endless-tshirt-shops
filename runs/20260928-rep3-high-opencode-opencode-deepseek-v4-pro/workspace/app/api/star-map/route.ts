import { NextRequest } from "next/server";
import { generateStarMapSvg } from "@/lib/starMap";
import { designFromQuery } from "@/lib/config";
import sharp from "sharp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = Object.fromEntries(req.nextUrl.searchParams.entries());
  const d = designFromQuery(q);
  const format = q.format === "png" ? "png" : "svg";
  // Print output is rendered at higher resolution for DTG.
  const scale = format === "png" ? 1.5 : 1;

  const svg = generateStarMapSvg({
    date: d.date,
    lat: d.lat,
    lng: d.lng,
    locationName: d.locationName,
    title: d.title,
    subtitle: d.subtitle,
    time: d.time,
    scale,
  });

  if (format === "svg") {
    return new Response(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=60, s-maxage=300",
      },
    });
  }

  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  return new Response(png, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
