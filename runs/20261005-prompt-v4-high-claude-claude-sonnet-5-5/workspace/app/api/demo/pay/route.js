import { config, originFromHeaders } from '@/lib/config.js';
import { verify } from '@/lib/sign.js';
import { decodeDesign } from '@/lib/design.js';
import { fulfillDemoOrder } from '@/lib/payments.js';

export const runtime = 'nodejs';
export const maxDuration = 60;

const clean = (v, n = 120) => String(v || '').replace(/[\u0000-\u001f<>]/g, ' ').trim().slice(0, n);

// Sandbox-only stand-in for a payment: no card is charged and nothing physical is produced.
export async function POST(request) {
  if (!config.demoPayments) return Response.json({ error: 'Demo payments are disabled.' }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const payload = verify(body.token);
  if (!payload || payload.t !== 'demo-checkout') return Response.json({ error: 'This checkout link has expired.' }, { status: 400 });
  const v = decodeDesign(payload.design);
  if (!v.ok) return Response.json({ error: v.error }, { status: 400 });
  const a = body.address || {};
  const recipient = {
    name: clean(body.name), email: clean(body.email), phone: clean(body.phone, 30),
    address: { line1: clean(a.line1), line2: clean(a.line2), city: clean(a.city), state: clean(a.state), postalCode: clean(a.postalCode, 20), country: payload.country },
  };
  if (!recipient.name || !recipient.email || !recipient.address.line1 || !recipient.address.city || !recipient.address.postalCode) {
    return Response.json({ error: 'Please complete name, email and address.' }, { status: 400 });
  }
  const result = await fulfillDemoOrder({ design: v.design, recipient, origin: originFromHeaders(request.headers) });
  if (!result.ok) {
    console.error('demo fulfilment failed', JSON.stringify(result.details || result));
    return Response.json({ error: 'The print provider rejected the order.', details: result.details?.outcome }, { status: 502 });
  }
  return Response.json({ url: `/success?ref=${encodeURIComponent(result.ref)}` });
}
