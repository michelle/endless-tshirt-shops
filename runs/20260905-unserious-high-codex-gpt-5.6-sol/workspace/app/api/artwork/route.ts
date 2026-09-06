import sharp from 'sharp';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const timestamp = new URL(request.url).searchParams.get('timestamp') || '';
  if (!/^\d{13}$/.test(timestamp)) return new Response('A 13-digit timestamp is required.', { status: 400 });

  const svg = Buffer.from(`
    <svg width="4665" height="5844" viewBox="0 0 4665 5844" xmlns="http://www.w3.org/2000/svg">
      <rect width="4665" height="5844" fill="none"/>
      <text x="2332.5" y="1840" text-anchor="middle" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="430" font-weight="700" letter-spacing="-18">${timestamp}</text>
      <text x="2332.5" y="2080" text-anchor="middle" fill="#8f8f8f" font-family="Arial, Helvetica, sans-serif" font-size="100" font-weight="700" letter-spacing="18">EXACTLY ONE (1) MOMENT</text>
    </svg>
  `);
  const png = await sharp(svg).png({ compressionLevel: 9, palette: true }).toBuffer();
  return new Response(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      'Content-Disposition': `inline; filename="datetime-${timestamp}.png"`,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
