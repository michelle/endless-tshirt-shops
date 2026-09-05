import sharp from 'sharp';

function escapeXml(text) { return String(text).replace(/[<>&'\"]/g, (char) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[char])); }

export default async function handler(req, res) {
  const timestamp = String(req.query.timestamp || '');
  if (!/^\d{13}$/.test(timestamp)) return res.status(400).send('Invalid artwork timestamp.');
  const svg = `<svg width="2490" height="3510" viewBox="0 0 2490 3510" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="transparent"/><text x="1245" y="1510" text-anchor="middle" fill="white" font-family="Arial, Helvetica, sans-serif" font-size="152" font-weight="600" letter-spacing="3">${escapeXml(timestamp)}</text></svg>`;
  const image = await sharp(Buffer.from(svg)).png().toBuffer();
  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  return res.status(200).send(image);
}
