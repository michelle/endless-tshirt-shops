import { NextResponse } from "next/server";
import sharp from "sharp";
import { verifyArtworkSignature } from "@/lib/store";

export const runtime = "nodejs";
export const maxDuration = 30;

function escapeXml(value: string) {
  return value.replace(/[<>&"']/g, (character) => {
    const entities: Record<string, string> = {
      "<": "&lt;",
      ">": "&gt;",
      "&": "&amp;",
      '"': "&quot;",
      "'": "&apos;",
    };
    return entities[character];
  });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const timestamp = url.searchParams.get("timestamp") || "";
  const sessionId = url.searchParams.get("session") || "";
  const signature = url.searchParams.get("signature") || "";

  if (
    !/^\d{13}$/.test(timestamp) ||
    !sessionId.startsWith("cs_") ||
    !verifyArtworkSignature(timestamp, sessionId, signature)
  ) {
    return NextResponse.json({ error: "Invalid artwork link." }, { status: 403 });
  }

  const svg = Buffer.from(`
    <svg width="4665" height="5844" viewBox="0 0 4665 5844" xmlns="http://www.w3.org/2000/svg">
      <rect width="4665" height="5844" fill="none"/>
      <text x="2332.5" y="1880" text-anchor="middle"
        fill="#ffffff" font-family="DejaVu Sans Mono, monospace"
        font-size="430" font-weight="700" letter-spacing="10">${escapeXml(timestamp)}</text>
    </svg>
  `);
  const png = await sharp(svg).png({ compressionLevel: 9 }).toBuffer();

  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `inline; filename="datetime-${timestamp}.png"`,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
