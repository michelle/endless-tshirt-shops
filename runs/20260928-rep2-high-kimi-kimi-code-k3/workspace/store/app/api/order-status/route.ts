import Stripe from 'stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const sessionId = new URL(req.url).searchParams.get('session_id') ?? '';
  if (!sessionId.startsWith('cs_')) {
    return Response.json({ error: 'Invalid session id' }, { status: 400 });
  }
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const meta = session.metadata ?? {};
    return Response.json({
      paid: session.payment_status === 'paid',
      ...(meta.prodigiOrderId ? { prodigiOrderId: meta.prodigiOrderId } : {}),
      ...(meta.prodigiStatus ? { prodigiStatus: meta.prodigiStatus } : {}),
    });
  } catch {
    return Response.json({ error: 'Session not found' }, { status: 404 });
  }
}
