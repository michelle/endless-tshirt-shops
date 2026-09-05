import { NextRequest } from "next/server";
import sharp from "sharp";

export const runtime = "nodejs";

function escapeXml(value: string) {
  return value.replace(/[<>&'"]/g, (character) => ({
    "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;",
  })[character] || character);
}

export async function GET(request: NextRequest) {
  const timestamp = Number(request.nextUrl.searchParams.get("timestamp"));
  if (!Number.isInteger(timestamp) || String(timestamp).length !== 13) {
    return new Response("Invalid timestamp", { status: 400 });
  }

  const moment = escapeXml(new Date(timestamp).toISOString());
  const digits = escapeXml(String(timestamp));
  const artwork = `
    <svg width="2490" height="3510" viewBox="0 0 2490 3510" xmlns="http://www.w3.org/2000/svg">
      <g fill="#DFFF3F" text-anchor="middle" font-family="DejaVu Sans Mono, monospace">
        <circle cx="345" cy="1310" r="18"/>
        <circle cx="2145" cy="1760" r="11"/>
        <path d="M355 1490H2135" stroke="#DFFF3F" stroke-width="9" stroke-dasharray="20 24"/>
        <text x="1245" y="1270" font-size="66" letter-spacing="28">YOUR MOMENT</text>
        <text x="1245" y="1645" font-size="248" font-weight="700" letter-spacing="-12">${digits}</text>
        <text x="1245" y="1830" font-size="58" letter-spacing="8">${moment}</text>
        <path d="M355 1930H2135" stroke="#DFFF3F" stroke-width="9" stroke-dasharray="20 24"/>
        <text x="1245" y="2140" font-size="54" font-style="italic">datetime.store</text>
      </g>
    </svg>`;

  const png = await sharp(Buffer.from(artwork)).png({ compressionLevel: 9, palette: true }).toBuffer();
  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Disposition": `inline; filename="datetime-${timestamp}.png"`,
    },
  });
}
