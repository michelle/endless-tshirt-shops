import sharp from "sharp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function xmlEscape(value: string) {
  return value.replace(/[<>&'\"]/g, (character) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[character]!);
}

export async function GET(_request: Request, context: { params: Promise<{ timestamp: string }> }) {
  const params = await context.params;
  const timestamp = params.timestamp.endsWith(".png") ? params.timestamp.slice(0, -4) : params.timestamp;
  if (!/^\d{13}$/.test(timestamp)) return new Response("Invalid timestamp", { status: 400 });

  const safeTimestamp = xmlEscape(timestamp);
  const artwork = `
    <svg width="4677" height="5881" viewBox="0 0 4677 5881" xmlns="http://www.w3.org/2000/svg">
      <text x="2338.5" y="1650" text-anchor="middle" fill="#ffffff"
        font-family="DejaVu Sans Mono, monospace" font-size="405" font-weight="700"
        letter-spacing="10">${safeTimestamp}</text>
      <text x="2338.5" y="1825" text-anchor="middle" fill="#ffffff" fill-opacity="0.58"
        font-family="DejaVu Sans Mono, monospace" font-size="74" font-weight="400"
        letter-spacing="30">UNIX TIME · MILLISECONDS</text>
    </svg>`;

  const png = await sharp(Buffer.from(artwork)).png({ compressionLevel: 9, adaptiveFiltering: true }).toBuffer();
  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Content-Length": String(png.length),
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Disposition": `inline; filename="datetime-${timestamp}.png"`
    }
  });
}
