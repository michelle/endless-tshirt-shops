import { NextResponse } from 'next/server';
import { fulfillPaymentIntent, orderSnapshot } from '@/lib/fulfillment';
import { clientSecretMatches, stripe } from '@/lib/stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Reads and settles a single order. The PaymentIntent client secret is the
 * bearer credential — the browser that created the order already has it, and
 * nobody else does, so no extra session or database lookup is needed.
 */
async function loadIntent(id: string, clientSecret: string | null) {
  if (!id.startsWith('pi_') || !clientSecret) return null;
  const paymentIntent = await stripe().paymentIntents.retrieve(id);
  if (!clientSecretMatches(paymentIntent.client_secret, clientSecret)) return null;
  return paymentIntent;
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const clientSecret = new URL(request.url).searchParams.get('client_secret');

  try {
    const paymentIntent = await loadIntent(id, clientSecret);
    if (!paymentIntent) return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
    return NextResponse.json(await orderSnapshot(paymentIntent));
  } catch (error) {
    console.error('[orders] lookup failed', id, error);
    return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
  }
}

/**
 * Browser-side backstop: called right after a successful confirmation so the
 * shopper sees a real order number even if the Stripe webhook is delayed.
 * `fulfillPaymentIntent` is idempotent, so this racing the webhook is fine.
 */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  let body: { clientSecret?: string } = {};
  try {
    body = await request.json();
  } catch {
    /* empty body is fine */
  }

  try {
    const paymentIntent = await loadIntent(id, body.clientSecret ?? null);
    if (!paymentIntent) return NextResponse.json({ error: 'Order not found.' }, { status: 404 });

    const result = await fulfillPaymentIntent(paymentIntent);
    const refreshed = await stripe().paymentIntents.retrieve(id);
    return NextResponse.json({ ...(await orderSnapshot(refreshed)), result });
  } catch (error) {
    console.error('[orders] settle failed', id, error);
    return NextResponse.json({ error: 'Could not settle that order.' }, { status: 500 });
  }
}
