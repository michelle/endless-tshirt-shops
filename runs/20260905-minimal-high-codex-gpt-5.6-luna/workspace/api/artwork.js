import sharp from 'sharp';

function esc(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[character]));
}

export default async function handler(req, res) {
  const parsed = new Date(req.query.timestamp);
  if (Number.isNaN(parsed.getTime())) return res.status(400).send('Invalid timestamp');
  const fit = req.query.fit === 'classic' ? 'CLASSIC' : 'FIT';
  const year = parsed.getUTCFullYear();
  const date = `${year}-${String(parsed.getUTCMonth() + 1).padStart(2, '0')}-${String(parsed.getUTCDate()).padStart(2, '0')}`;
  const time = `${String(parsed.getUTCHours()).padStart(2, '0')}:${String(parsed.getUTCMinutes()).padStart(2, '0')}:${String(parsed.getUTCSeconds()).padStart(2, '0')}`;
  const ms = String(parsed.getUTCMilliseconds()).padStart(3, '0');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="2400" height="2900" viewBox="0 0 2400 2900"><rect width="2400" height="2900" fill="none"/><g text-anchor="middle" font-family="monospace"><text x="1200" y="1320" fill="#d8ff3e" font-size="86" letter-spacing="5">${esc(date)}</text><text x="1200" y="1580" fill="#f4f1eb" font-size="245" letter-spacing="-16">${esc(time)}<tspan fill="#ff6e5d" font-size="100" letter-spacing="-6">.${ms}</tspan></text><text x="1200" y="1750" fill="#94948d" font-size="42" letter-spacing="10">DATETIME.STORE / ${fit}</text></g></svg>`;
  try {
    const png = await sharp(Buffer.from(svg)).png().toBuffer();
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    return res.status(200).send(png);
  } catch (error) {
    console.error('artwork_render_error', error);
    return res.status(500).send('Artwork render failed');
  }
}
