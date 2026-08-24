export default function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: { message: 'Method not allowed' } });
  }
  return res.status(200).json({
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
    paymentsConfigured: Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PUBLISHABLE_KEY),
    fulfillmentConfigured: Boolean(process.env.PRODIGI_API_KEY),
    mode: process.env.PRODIGI_ENV === 'live' ? 'live' : 'sandbox',
  });
}
