import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(_request: VercelRequest, response: VercelResponse) {
  const stripe = Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET);
  const prodigi = Boolean(process.env.PRODIGI_API_KEY);
  return response.status(stripe && prodigi ? 200 : 503).json({ status: stripe && prodigi ? 'ready' : 'setup-required', stripe, prodigi, prodigiEnvironment: (process.env.PRODIGI_API_BASE || '').includes('sandbox') ? 'sandbox' : 'live' });
}
