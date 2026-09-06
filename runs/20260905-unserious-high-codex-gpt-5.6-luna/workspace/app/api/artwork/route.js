import sharp from 'sharp';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const rawTimestamp = searchParams.get('timestamp') || String(Date.now());
  const timestamp = rawTimestamp.replace(/[^0-9]/g, '').slice(0, 16) || String(Date.now());
  const style = searchParams.get('style') === 'unisex' ? 'unisex' : 'fitted';
  const image = `
    <svg width="4200" height="5370" viewBox="0 0 4200 5370" xmlns="http://www.w3.org/2000/svg">
      <rect width="4200" height="5370" fill="white"/>
      <text x="2100" y="1960" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="310" font-weight="700" letter-spacing="-8" fill="black">${timestamp}</text>
      <text x="2100" y="2320" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="118" letter-spacing="16" fill="#2457ff">DATETIME.STORE</text>
      <text x="2100" y="5030" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="88" letter-spacing="7" fill="#666">${style.toUpperCase()} / EXACTLY ONCE</text>
    </svg>`;
  const png = await sharp(Buffer.from(image)).png().toBuffer();
  return new Response(png, { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=31536000, immutable' } });
}
