import { NextRequest, NextResponse } from 'next/server';
import { verifyOrderToken } from '@/lib/orders';
import { fulfillOrder } from '@/lib/fulfill';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * POST /api/payments/testpay { token, card: { number, exp, cvc, name } }
 *
 * Sandbox payment mode — active only when Stripe is NOT configured.
 * It simulates a card payment with the same semantics as Stripe's test
 * cards (4242… succeeds, 4000 0000 0000 0002 declined) and enforces the
 * store's core invariant server-side: the Prodigi order is created ONLY
 * after the simulated payment succeeds.
 */

function luhn(num: string): boolean {
  let sum = 0;
  let alt = false;
  for (let i = num.length - 1; i >= 0; i--) {
    let d = num.charCodeAt(i) - 48;
    if (d < 0 || d > 9) return false;
    if (alt) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    alt = !alt;
  }
  return sum % 10 === 0;
}

const DECLINE_CARDS: Record<string, string> = {
  '4000000000000002': 'Your card was declined. (sandbox decline card)',
  '4000000000009995': 'Insufficient funds. (sandbox decline card)',
  '4000000000000127': 'Incorrect CVC. (sandbox decline card)',
};

function validateCard(card: { number?: string; exp?: string; cvc?: string; name?: string }):
  | { ok: true; digits: string }
  | { ok: false; error: string } {
  const digits = (card.number ?? '').replace(/[\s-]/g, '');
  if (!/^\d{13,19}$/.test(digits) || !luhn(digits)) {
    return { ok: false, error: 'Invalid card number. In sandbox mode, use 4242 4242 4242 4242.' };
  }
  const m = /^(\d{2})\s*\/\s*(\d{2})$/.exec(card.exp ?? '');
  if (!m) return { ok: false, error: 'Expiry must be MM/YY.' };
  const month = Number(m[1]);
  const year = 2000 + Number(m[2]);
  if (month < 1 || month > 12) return { ok: false, error: 'Invalid expiry month.' };
  const now = new Date();
  if (year < now.getUTCFullYear() || (year === now.getUTCFullYear() && month < now.getUTCMonth() + 1)) {
    return { ok: false, error: 'Card expired.' };
  }
  if (!/^\d{3,4}$/.test(card.cvc ?? '')) return { ok: false, error: 'CVC must be 3–4 digits.' };
  if ((card.name ?? '').trim().length < 2) return { ok: false, error: 'Name on card is required.' };
  return { ok: true, digits };
}

export async function POST(req: NextRequest) {
  let body: { token?: string; card?: { number?: string; exp?: string; cvc?: string; name?: string } };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const order = verifyOrderToken(body.token ?? '');
  if (!order) return NextResponse.json({ error: 'Invalid or expired order. Please start again.' }, { status: 400 });

  if (process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Sandbox payments are disabled while Stripe is configured.' }, { status: 400 });
  }

  const card = validateCard(body.card ?? {});
  if (!card.ok) return NextResponse.json({ error: card.error }, { status: 400 });

  const decline = DECLINE_CARDS[card.digits];
  if (decline) {
    return NextResponse.json({ status: 'declined', error: decline }, { status: 402 });
  }

  // ---- payment succeeded (simulated) → now, and only now, fulfil ----
  order.payment.provider = 'testpay';
  order.payment.reference = `testpay_${card.digits.slice(-4)}_${Date.now().toString(36)}`;
  order.payment.paidAt = Date.now();

  const result = await fulfillOrder(order);
  if (!result.ok) {
    return NextResponse.json(
      {
        status: 'paid_fulfilment_failed',
        error: `Payment captured but the print order failed: ${result.error}. Contact support — you will not be charged twice.`,
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    status: 'paid',
    orderId: order.orderId,
    prodigiOrderId: result.prodigiOrderId,
    outcome: result.outcome,
    issues: result.issues ?? undefined,
  });
}
