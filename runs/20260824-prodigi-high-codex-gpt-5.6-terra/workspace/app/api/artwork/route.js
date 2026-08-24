import sharp from 'sharp';

export const runtime = 'nodejs';
export async function GET(request) {
  const value = new URL(request.url).searchParams.get('timestamp') || '';
  if (!/^\d{13}$/.test(value)) return new Response('Not found', { status: 404 });
  const svg = `<svg width="4680" height="5790" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="transparent"/><text x="2340" y="2895" text-anchor="middle" dominant-baseline="middle" fill="white" font-family="Arial, Helvetica, sans-serif" font-size="210" font-weight="500" letter-spacing="-12">${value}</text></svg>`;
  const image = await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
  return new Response(image, { headers: { 'content-type': 'image/png', 'cache-control': 'public, max-age=31536000, immutable' } });
}
