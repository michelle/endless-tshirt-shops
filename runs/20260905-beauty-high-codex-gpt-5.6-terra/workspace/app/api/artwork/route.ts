import { Resvg } from "@resvg/resvg-js";
import { NextRequest, NextResponse } from "next/server";
import { artworkSvg, decodeMoment, isValidMoment } from "@/lib/artwork";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const moment = decodeMoment(request.nextUrl.searchParams.get("d") || "");
  const signature = request.nextUrl.searchParams.get("s") || "";
  if (!moment || !isValidMoment(moment, signature)) return new NextResponse("Not found", { status: 404 });
  const png = new Resvg(artworkSvg(moment), { fitTo: { mode: "width", value: 4680 }, background: "rgba(0,0,0,0)" }).render().asPng();
  return new NextResponse(new Uint8Array(png).buffer, { headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=31536000, immutable", "Content-Disposition": `inline; filename="datetime-${moment.ms}.png"` } });
}
