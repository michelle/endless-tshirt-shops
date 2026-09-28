import Stripe from 'stripe';

export const runtime = 'nodejs';

// Prodigi posts CloudEvents-shaped JSON here when an order changes stage.
// We mirror the stage onto the Stripe checkout session metadata so the
// /success page can show it. Always 200 — unknown shapes are ignored.
export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return Response.json({ received: true });
  }

  try {
    const order = body?.data?.order;
    const merchantReference: string | undefined = order?.merchantReference;
    const stage: string | undefined =
      order?.status?.stage ??
      (typeof body?.type === 'string' ? body.type.split('#')[1] : undefined);
    if (merchantReference && stage && merchantReference.startsWith('cs_')) {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
      const session = await stripe.checkout.sessions.retrieve(merchantReference);
      await stripe.checkout.sessions.update(merchantReference, {
        metadata: { ...session.metadata, prodigiStatus: stage },
      });
    }
  } catch (err) {
    console.error('prodigi webhook handling failed', err);
  }
  return Response.json({ received: true });
}
