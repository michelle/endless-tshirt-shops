import { NextResponse } from "next/server";
import sharp from "sharp";
import { artworkSvg, readArtworkToken } from "@/lib/artwork";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token: rawToken } = await context.params;
  const timestamp = readArtworkToken(rawToken.replace(/\.png$/, ""));
  if (!timestamp) return NextResponse.json({ error: "Invalid artwork link" }, { status: 404 });

  const png = await sharp(Buffer.from(artworkSvg(timestamp))).png().toBuffer();
  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `inline; filename="datetime-${timestamp}.png"`,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
