import sharp from 'sharp';

function escapeXml(value) {
  return String(value).replace(/[<>&'"]/g, (char) => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;',
  }[char]));
}

function artworkSvg(timestamp) {
  const stamp = escapeXml(timestamp);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="2400" height="3000" viewBox="0 0 2400 3000">
  <style>
    .stamp { font: 700 155px 'Arial', sans-serif; letter-spacing: 3px; }
    .caption { font: 500 34px 'Arial', sans-serif; letter-spacing: 14px; }
  </style>
  <text x="1200" y="1340" fill="#ffffff" text-anchor="middle" class="stamp">${stamp}</text>
  <text x="1200" y="1430" fill="#8ee9df" text-anchor="middle" class="caption">THE MOMENT, MADE PHYSICAL</text>
</svg>`;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).send('Method not allowed');
  }
  const rawTimestamp = req.query?.timestamp || req.query?.t || Date.now();
  const timestamp = Number(rawTimestamp);
  if (!Number.isFinite(timestamp) || timestamp < 0) {
    return res.status(400).send('Invalid timestamp');
  }

  try {
    const png = await sharp(Buffer.from(artworkSvg(Math.round(timestamp)))).png().toBuffer();
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Content-Disposition', 'inline; filename="datetime-shirt-art.png"');
    return res.status(200).send(png);
  } catch (error) {
    console.error('Artwork generation failed', error);
    return res.status(500).send('Artwork generation failed');
  }
}
