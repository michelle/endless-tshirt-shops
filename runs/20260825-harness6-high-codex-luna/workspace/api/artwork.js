const crypto = require('crypto');
const sharp = require('sharp');
const { signArtwork, json } = require('./_lib');
function escapeXml(value) { return String(value).replace(/[<>&'\"]/g, (char) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[char])); }
module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed.' }); const stamp = Number(req.query?.stamp); const style = req.query?.style === 'unisex' ? 'unisex' : 'fitted'; if (!Number.isSafeInteger(stamp) || stamp < 1500000000000) return json(res, 400, { error: 'Invalid artwork timestamp.' });
  if (process.env.ARTWORK_SIGNING_SECRET) { const expected = signArtwork(stamp, style); const provided = String(req.query?.sig || ''); if (!provided || provided.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expected))) return json(res, 403, { error: 'Artwork signature invalid.' }); }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="2400" height="3000" viewBox="0 0 2400 3000"><rect width="2400" height="3000" fill="none"/><text x="1200" y="1040" text-anchor="middle" fill="#ffffff" font-family="DejaVu Sans Mono,monospace" font-size="112" font-weight="500" letter-spacing="-6">${escapeXml(stamp)}</text></svg>`;
  try { const png = await sharp(Buffer.from(svg)).png().toBuffer(); res.status(200).setHeader('content-type', 'image/png').end(png); } catch (error) { console.error('[artwork]', error); return json(res, 500, { error: 'Artwork could not be rendered.' }); }
};
