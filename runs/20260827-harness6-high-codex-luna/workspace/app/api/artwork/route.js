import sharp from "sharp";

export const runtime = "nodejs";

function safe(value) {
  return String(value || "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[character]));
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const timestamp = Number(searchParams.get("ts")) || Date.now();
  const date = new Date(timestamp);
  const dateText = new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit", year: "numeric", timeZone: "UTC" }).format(date).toUpperCase();
  const timeText = `${String(date.getUTCHours()).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(2, "0")}:${String(date.getUTCSeconds()).padStart(2, "0")}.${String(date.getUTCMilliseconds()).padStart(3, "0")}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="2400" height="3000" viewBox="0 0 2400 3000"><rect width="2400" height="3000" fill="none"/><g fill="#ffffff" text-anchor="middle" font-family="Arial,Helvetica,sans-serif"><text x="1200" y="1420" font-size="108" font-weight="700" letter-spacing="12">${safe(dateText)}</text><text x="1200" y="1600" font-size="190" font-weight="700" letter-spacing="4">${safe(timeText)}</text><text x="1200" y="1725" font-size="42" letter-spacing="16">UTC / LIVE</text></g></svg>`;
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  return new Response(png, { headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=31536000, immutable" } });
}
