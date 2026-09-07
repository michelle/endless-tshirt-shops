import sharp from 'sharp';

function escapeXml(value) {
  return String(value).replace(/[<>&'\"]/g, (character) => ({
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
    "'": '&apos;',
    '"': '&quot;',
  }[character]));
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const timestamp = Number(searchParams.get('timestamp'));
  const style = searchParams.get('style') === 'unisex' ? 'unisex' : 'fitted';

  if (!Number.isFinite(timestamp) || timestamp < 1) {
    return new Response('Invalid timestamp', { status: 400 });
  }

  const milliseconds = Math.round(timestamp).toString();
  const iso = new Date(timestamp).toISOString();
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="4677" height="5787" viewBox="0 0 4677 5787">
      <g fill="#ffffff" font-family="DejaVu Sans Mono, Menlo, monospace" text-anchor="middle">
        <text x="2338.5" y="2820" font-size="300" font-weight="700" letter-spacing="2">${escapeXml(milliseconds)}</text>
        <text x="2338.5" y="3200" font-size="118" font-weight="500" letter-spacing="10" opacity="0.78">${escapeXml(iso)} · ${style.toUpperCase()}</text>
        <text x="2338.5" y="3460" font-size="86" letter-spacing="18" opacity="0.6">DATETIME.STORE</text>
      </g>
    </svg>`;

  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  return new Response(png, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
