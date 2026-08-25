import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { artworkSvg, verifyArtworkSignature } from "@/lib/artwork";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const timestamp = request.nextUrl.searchParams.get("timestamp") || "";
  const signature = request.nextUrl.searchParams.get("sig") || "";
  if (!/^\d{13}$/.test(timestamp) || !verifyArtworkSignature(timestamp, signature)) {
    return NextResponse.json({ error: "Invalid artwork link" }, { status: 403 });
  }
  const png = await sharp(artworkSvg(timestamp)).png({ compressionLevel: 9 }).withMetadata({ density: 300 }).toBuffer();
  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `inline; filename="datetime-${timestamp}.png"`,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
