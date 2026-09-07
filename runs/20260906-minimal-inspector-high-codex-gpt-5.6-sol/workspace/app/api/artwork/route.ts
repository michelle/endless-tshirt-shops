import sharp from "sharp";
import { NextResponse } from "next/server";
import { fits, sizes, type Fit, type Size } from "@/lib/catalog";
import { isValidArtworkSignature } from "@/lib/artwork";

export const runtime = "nodejs";

function escapeXml(value: string) {
  return value.replace(/[<>&"']/g, (character) => ({
    "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;",
  })[character] || character);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const timestamp = Number(url.searchParams.get("timestamp"));
  const fit = url.searchParams.get("fit") as Fit;
  const size = url.searchParams.get("size") as Size;
  const signature = url.searchParams.get("signature") || "";

  if (!Number.isSafeInteger(timestamp) || !fits[fit] || !sizes.includes(size) || !isValidArtworkSignature(timestamp, fit, size, signature)) {
    return NextResponse.json({ error: "Invalid artwork link." }, { status: 403 });
  }

  const text = escapeXml(String(timestamp));
  const svg = Buffer.from(`
    <svg width="4665" height="5844" viewBox="0 0 4665 5844" xmlns="http://www.w3.org/2000/svg">
      <rect width="4665" height="5844" fill="transparent"/>
      <text x="2332.5" y="1425" fill="#ffffff" font-family="DejaVu Sans Mono, monospace" font-size="300" font-weight="700" text-anchor="middle" dominant-baseline="middle">${text}</text>
    </svg>
  `);
  const png = await sharp(svg).png({ compressionLevel: 9 }).toBuffer();

  return new NextResponse(new Uint8Array(png), {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `inline; filename="datetime-${timestamp}.png"`,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
