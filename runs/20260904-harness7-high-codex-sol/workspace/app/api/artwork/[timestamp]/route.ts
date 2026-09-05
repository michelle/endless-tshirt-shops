import sharp from "sharp";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ timestamp: string }> }) {
  const { timestamp } = await context.params;
  if (!/^\d{13}$/.test(timestamp)) return new Response("Not found", { status: 404 });
  const width = 4680;
  const height = 5790;
  const safeTimestamp = timestamp.replace(/[^0-9]/g, "");
  const svg = Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="none"/><text x="50%" y="42%" text-anchor="middle" dominant-baseline="middle" fill="#ffffff" font-family="DejaVu Sans Mono, monospace" font-size="390" font-weight="500" letter-spacing="-18">${safeTimestamp}</text></svg>`);
  const png = await sharp(svg).png({ compressionLevel: 9 }).toBuffer();
  return new Response(new Uint8Array(png), {
    headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=31536000, immutable", "Content-Disposition": `inline; filename="datetime-${safeTimestamp}.png"` },
  });
}
