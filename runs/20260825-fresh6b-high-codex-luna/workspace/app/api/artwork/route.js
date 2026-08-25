import sharp from 'sharp';

export const runtime = 'nodejs';

function escapeXml(value) {
  return String(value).replace(/[<>&'\"]/g, (character) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[character]));
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const stamp = Number(searchParams.get('stamp'));
  const style = searchParams.get('style') === 'unisex' ? 'UNISEX' : 'FITTED';
  if (!Number.isSafeInteger(stamp) || stamp < 1) return new Response('Invalid artwork', { status: 400 });
  const date = new Date(stamp);
  const pad = (value, length = 2) => String(value).padStart(length, '0');
  const text = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="2490" height="3510" viewBox="0 0 2490 3510"><rect width="100%" height="100%" fill="black"/><g fill="white" text-anchor="middle" font-family="monospace"><text x="1245" y="1300" font-size="78" letter-spacing="10">LOCAL TIME / 01</text><text x="1245" y="1750" font-size="128">${escapeXml(text)}</text><rect x="800" y="1840" width="890" height="5" fill="white"/><text x="1245" y="1970" font-size="54" letter-spacing="12">${style} · THIS MOMENT WILL PASS</text></g></svg>`;
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  return new Response(png, { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=31536000, immutable' } });
}
