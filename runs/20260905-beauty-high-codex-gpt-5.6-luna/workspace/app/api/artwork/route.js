import sharp from "sharp";

function safeText(value, fallback) {
  return String(value || fallback).replace(/[<>&"']/g, "");
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const rawTimestamp = searchParams.get("timestamp");
  const date = rawTimestamp ? new Date(rawTimestamp) : new Date();
  const iso = Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
  const stamp = iso.replace("T", " ").replace("Z", " UTC");
  const style = safeText(searchParams.get("style"), "fitted");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="2400" height="1200" viewBox="0 0 2400 1200"><rect width="2400" height="1200" fill="#141414"/><text x="1200" y="570" fill="#fff8f0" text-anchor="middle" font-family="monospace" font-size="106" letter-spacing="2">${safeText(stamp, iso)}</text><text x="1200" y="710" fill="#fff8f0" opacity=".66" text-anchor="middle" font-family="sans-serif" font-size="30" letter-spacing="10">DATETIME.STORE · ${style.toUpperCase()}</text></svg>`;
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  return new Response(png, { headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=86400, immutable" } });
}
