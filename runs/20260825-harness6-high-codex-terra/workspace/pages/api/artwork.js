export default function handler(req, res) {
  const timestamp = String(req.query.timestamp || '0').replace(/\D/g, '').slice(0, 15) || '0';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="4665" height="5844" viewBox="0 0 4665 5844"><rect width="100%" height="100%" fill="none"/><text x="2332" y="2850" text-anchor="middle" fill="white" font-family="Arial, Helvetica, sans-serif" font-size="220" font-weight="500" letter-spacing="10">${timestamp}</text></svg>`;
  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  res.status(200).send(svg);
}
