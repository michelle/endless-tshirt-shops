import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripe } from '@/lib/stripe';
import { isMockPayments, publicBaseUrl, stripeWebhookSecret } from '@/lib/config';
import { orders } from '@/lib/orders';
import { createOrder as createProdigiOrder, getOrder as getProdigiOrder } from '@/lib/prodigi';
import { assetCache } from '@/lib/asset-cache';
import { renderDesign } from '@/lib/design-renderer';
import { SHIRTS, INK_HEX } from '@/lib/products';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Stripe webhook handler.
 *
 * Verifies the signature, then on `checkout.session.completed`:
 *  1. Looks up the order by stripeSessionId.
 *  2. Ensures the asset PNG is available (re-renders if needed).
 *  3. Submits the order to Prodigi for printing & shipping.
 */
export async function POST(req: NextRequest) {
  const stripe = getStripe();
  const sig = req.headers.get('stripe-signature');
  const body = await req.text();

  let event: Stripe.Event | null = null;
  if (stripe && sig && stripeWebhookSecret()) {
    try {
      event = stripe.webhooks.constructEvent(body, sig, stripeWebhookSecret());
    } catch (err: any) {
      return NextResponse.json({ error: `Webhook signature failed: ${err?.message ?? err}` }, { status: 400 });
    }
  } else if (stripe && !isMockPayments()) {
    // No signing secret configured — accept JSON for testing.
    try { event = JSON.parse(body) as Stripe.Event; } catch { return NextResponse.json({ error: 'invalid json' }, { status: 400 }); }
  } else {
    // Mock payments — no-op handler.
    return NextResponse.json({ ok: true, note: 'mock mode' });
  }

  if (!event) return NextResponse.json({ ok: true });

  switch (event.type) {
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded': {
      const session = event.data.object as Stripe.Checkout.Session;
      await handleCheckoutCompleted(session);
      break;
    }
    case 'checkout.session.expired':
    case 'checkout.session.async_payment_failed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const ord = orders.bySession(session.id);
      if (ord) orders.update(ord.id, { status: 'pending_payment' });
      break;
    }
    default:
      // ignore
      break;
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const ord = orders.bySession(session.id);
  if (!ord) {
    console.warn('[stripe-webhook] No order found for session', session.id);
    return;
  }
  if (ord.status !== 'pending_payment') {
    // idempotent — already handled
    return;
  }
  orders.update(ord.id, { status: 'paid_production', stripePaymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id });

  // Submit to Prodigi
  const base = publicBaseUrl();
  const assetUrl = `${base}${ord.assetUrl}?t=${encodeURIComponent(ord.idempotencyKey)}`;
  const shirt = SHIRTS.find((s) => s.color === ord.variant.color);
  if (!shirt) {
    console.error('[stripe-webhook] Unknown colour', ord.variant.color);
    return;
  }

  // Best-effort: ensure PNG is in cache.
  const cached = assetCache.byOrderId(ord.id);
  if (!cached) {
    try {
      const inkColor = shirt.ink === 'light' ? INK_HEX.light : INK_HEX.dark;
      const background = shirt.ink === 'light' ? 'dark' : 'light';
      const { png, width, height } = await renderDesign({ design: ord.design, inkColor, background });
      assetCache.set(`${ord.idempotencyKey}-${ord.variant.color}-${ord.variant.size}`, ord.id, png, width, height);
    } catch (e) {
      console.error('[stripe-webhook] could not render asset for prodigi', e);
    }
  }

  try {
    const shippingMethod = 'Standard';
    const prodigiResp = await createProdigiOrder({
      shippingMethod,
      recipient: {
        name: ord.shipping.name,
        email: ord.shipping.email,
        phoneNumber: ord.shipping.phone,
        address: {
          line1: ord.shipping.line1,
          line2: ord.shipping.line2,
          postalOrZipCode: ord.shipping.postalCode,
          countryCode: ord.shipping.countryCode,
          townOrCity: ord.shipping.city,
          stateOrCounty: ord.shipping.state,
        },
      },
      items: [
        {
          sku: ord.variant.sku,
          copies: 1,
          sizing: 'fillPrintArea',
          attributes: { color: ord.variant.color, size: ord.variant.size },
          recipientCost: { amount: (ord.amountCents / 100).toFixed(2), currency: 'USD' },
          assets: [
            {
              printArea: 'front',
              url: assetUrl,
            },
          ],
        },
      ],
      idempotencyKey: ord.idempotencyKey,
      callbackUrl: `${base}/api/webhooks/prodigi`,
      metadata: {
        internalOrderId: ord.id,
        stripeSessionId: session.id,
      },
    });

    const prodigiOrderId =
      prodigiResp?.order?.id ??
      prodigiResp?.orders?.[0]?.id ??
      prodigiResp?.id ??
      undefined;
    orders.update(ord.id, { status: 'prodigi_submitted', prodigiOrderId });
    console.log('[stripe-webhook] submitted to prodigi', { orderId: ord.id, prodigiOrderId });
  } catch (e: any) {
    console.error('[stripe-webhook] prodigi submit failed', e?.message ?? e);
    orders.update(ord.id, { status: 'prodigi_failed' });
  }
}
