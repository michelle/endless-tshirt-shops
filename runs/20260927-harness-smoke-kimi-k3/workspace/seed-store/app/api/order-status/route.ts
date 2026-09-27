import { getStripe } from '@/lib/stripe';

// Polled by the success page: reports payment + fulfillment state for a
// checkout session. Only exposes order metadata, never customer PII.

export async function GET(request: Request) {
  const sessionId = new URL(request.url).searchParams.get('session_id') ?? '';
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(sessionId)) {
    return Response.json({ error: 'Invalid session id' }, { status: 400 });
  }

  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId);
    return Response.json({
      paid: session.payment_status === 'paid',
      status: session.status,
      fulfilled: session.metadata?.fulfilled === 'true',
      prodigiOrderId: session.metadata?.prodigiOrderId ?? null,
      word: session.metadata?.word ?? null,
      paletteId: session.metadata?.paletteId ?? null,
      garmentColor: session.metadata?.garmentColor ?? null,
      size: session.metadata?.size ?? null,
    });
  } catch {
    return Response.json({ error: 'Order not found' }, { status: 404 });
  }
}
