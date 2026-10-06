// app/api/preview/route.ts
// Generates a low-res PNG preview of the personalised star map. The
// design page polls this every ~350ms to keep the live preview fresh.

import { NextRequest, NextResponse } from "next/server";
import { renderDesign, DesignInput } from "@/lib/design";
import { snapshot } from "@/lib/astronomy";
import { svgToPng } from "@/lib/render";
import { designSchema } from "@/lib/validate";

export const dynamic = "force-dynamic";

interface PreviewQuery {
  dateIso: string;
  lat: number;
  lng: number;
  placeName: string;
  headline: string;
  subtitle?: string;
  message?: string; // pipe-separated
  palette?: DesignInput["palette"];
  garment?: DesignInput["garment"];
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const messageList = (sp.get("message") ?? "")
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);

  const parsed = designSchema.safeParse({
    dateIso: sp.get("dateIso") ?? "",
    lat: parseFloat(sp.get("lat") ?? "0"),
    lng: parseFloat(sp.get("lng") ?? "0"),
    placeName: sp.get("placeName") ?? "",
    headline: sp.get("headline") ?? "",
    subtitle: sp.get("subtitle") ?? "",
    message: messageList,
    palette: sp.get("palette") ?? "ink",
    garmentColor: sp.get("garmentColor") ?? "black",
    garmentSize: sp.get("garmentSize") ?? "m",
    quantity: 1,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const v = parsed.data;
  const sky = snapshot({
    whenUtc: new Date(v.dateIso),
    lat: v.lat,
    lng: v.lng,
    placeName: v.placeName,
  });
  const design = renderDesign(
    {
      dateIso: v.dateIso,
      lat: v.lat,
      lng: v.lng,
      placeName: v.placeName,
      headline: v.headline,
      subtitle: v.subtitle ?? "",
      message: v.message ?? [],
      palette: v.palette,
      garment: v.garmentColor,
    },
    sky
  );

  // Choose content type based on ?format= :
  const format = (sp.get("format") ?? "svg").toLowerCase();
  if (format === "png") {
    try {
      const { buffer } = await svgToPng(design.svg, { width: 1000 });
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "public, max-age=60",
        },
      });
    } catch (e) {
      return NextResponse.json(
        { error: "PNG rendering failed: " + (e as Error).message },
        { status: 500 }
      );
    }
  }
  return new NextResponse(design.svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=60",
    },
  });
}
