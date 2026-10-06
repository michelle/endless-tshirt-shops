import { config, originFromHeaders } from '@/lib/config.js';
import { SHIPPING, validateDesign } from '@/lib/design.js';
import { createDemoCheckoutUrl, createStripeCheckout } from '@/lib/payments.js';

export const runtime = 'nodejs';

export async function POST(request) {
  let body;
  try { body = await request.json(); } catch { return Response.json({ error: 'Invalid request.' }, { status: 400 }); }
  const v = validateDesign(body.design);
  if (!v.ok) return Response.json({ error: v.error }, { status: 400 });
  const country = String(body.country || '');
  if (!SHIPPING[country]) return Response.json({ error: 'We do not ship to that country yet.' }, { status: 400 });
  if (!config.paymentsReady) return Response.json({ error: 'Payments are not configured.' }, { status: 503 });

  const origin = originFromHeaders(request.headers);
  try {
    const url = config.stripeEnabled
      ? await createStripeCheckout({ design: v.design, country, origin })
      : createDemoCheckoutUrl({ design: v.design, country, origin });
    return Response.json({ url });
  } catch (err) {
    console.error('checkout failed', err);
    return Response.json({ error: 'Could not start checkout. Please try again.' }, { status: 500 });
  }
}
