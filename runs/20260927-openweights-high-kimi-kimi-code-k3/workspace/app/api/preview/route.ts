import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { buildStarMapSVG } from "@/lib/starmap";
import { validateDesign, isDarkShirt } from "@/lib/design";
import { verifyDesign } from "@/lib/tokens";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

/** Low-res preview. Accepts either raw design params or a signed token. */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  let design;
  const token = q.get("token");
  if (token) {
    design = verifyDesign(token);
    if (!design)
      return NextResponse.json({ error: "Invalid token" }, { status: 403 });
  } else {
    const v = validateDesign({
      caption: q.get("caption"),
      date: q.get("date"),
      time: q.get("time"),
      place: q.get("place"),
      lat: q.get("lat"),
      lon: q.get("lon"),
      size: q.get("size") || "l",
      color: q.get("color") || "black",
    });
    if (typeof v === "string")
      return NextResponse.json({ error: v }, { status: 400 });
    design = v;
  }
  const svg = buildStarMapSVG(design, {
    darkShirt: isDarkShirt(design.color),
    widthPx: 760,
  });
  const png = await sharp(Buffer.from(svg), { density: 72 })
    .png({ compressionLevel: 8 })
    .toBuffer();
  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=120",
    },
  });
}
