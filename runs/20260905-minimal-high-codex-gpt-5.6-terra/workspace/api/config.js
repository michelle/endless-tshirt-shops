export default function handler(req, res) {
  if (!process.env.STRIPE_PUBLISHABLE_KEY) {
    return res.status(503).json({ error: 'Payments are not configured.' });
  }
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300');
  return res.status(200).json({ publishableKey: process.env.STRIPE_PUBLISHABLE_KEY });
}
