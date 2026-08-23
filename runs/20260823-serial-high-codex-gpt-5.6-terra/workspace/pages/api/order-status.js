import { fulfillSession } from '../../lib/fulfillment';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const sessionId = req.query.session_id;
  if (typeof sessionId !== 'string' || !sessionId.startsWith('cs_')) return res.status(400).json({ error: 'Invalid checkout session.' });
  try {
    return res.status(200).json(await fulfillSession(sessionId));
  } catch (error) {
    console.error('Order fulfillment failed', error);
    return res.status(502).json({ error: 'Payment is confirmed, but we could not reach the print service yet.' });
  }
}
