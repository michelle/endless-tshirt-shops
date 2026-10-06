import { NextRequest, NextResponse } from 'next/server';
import { orders } from '@/lib/orders';
import { createOrder as createProdigiOrder, getOrder as getProdigiOrder } from '@/lib/prodigi';
import { renderDesign } from '@/lib/design-renderer';
import { assetCache } from '@/lib/asset-cache';
import { SHIRTS, SHIRT_SKU, INK_HEX } from '@/lib/products';
import { publicBaseUrl } from '@/lib/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Debug endpoint: simulate the "post-payment" step and submit an order
 * to Prodigi. Use this to verify end-to-end prodigi integration without
 * going through Stripe (since Stripe webhooks require a configured webhook
 * secret).
 *
 *   GET /api/admin/test-prodigi?orderId=<id>
 */
export async function GET(req: NextRequest) {
  const orderId = new URL(req.url).searchParams.get('orderId');
  if (!orderId) return NextResponse.json({ error: 'orderId required' }, { status: 400 });
  const order = orders.get(orderId);
  if (!order) return NextResponse.json({ error: 'order not found' }, { status: 404 });

  const shirt = SHIRTS.find((s) => s.color === order.variant.color);
  if (!shirt) return NextResponse.json({ error: 'unknown shirt color' }, { status: 500 });
  const inkColor = shirt.ink === 'light' ? INK_HEX.light : INK_HEX.dark;
  const background = shirt.ink === 'light' ? 'dark' : 'light';

  orders.update(order.id, { status: 'paid_production' });

  // Make sure PNG is in cache (it should be from /api/checkout already).
  let cached = assetCache.byOrderId(order.id);
  if (!cached) {
    const { png, width, height } = await renderDesign({ design: order.design, inkColor, background });
    assetCache.set(`${order.idempotencyKey}-${order.variant.color}-${order.variant.size}`, order.id, png, width, height);
    cached = assetCache.byOrderId(order.id);
  }

  const base = publicBaseUrl(req);
  const assetUrl = `${base}/api/asset/${order.id}?t=${encodeURIComponent(order.idempotencyKey)}`;

  // Verify the asset URL is reachable.
  let fetchStatus: number | null = null;
  let contentType: string | null = null;
  try {
    const r = await fetch(assetUrl);
    fetchStatus = r.status;
    contentType = r.headers.get('content-type');
  } catch (e: any) {
    fetchStatus = -1;
  }

  try {
    const resp = await createProdigiOrder({
      shippingMethod: 'Standard',
      recipient: {
        name: order.shipping.name,
        email: order.shipping.email,
        phoneNumber: order.shipping.phone,
        address: {
          line1: order.shipping.line1,
          line2: order.shipping.line2,
          postalOrZipCode: order.shipping.postalCode,
          countryCode: order.shipping.countryCode,
          townOrCity: order.shipping.city,
          stateOrCounty: order.shipping.state,
        },
      },
      items: [
        {
          sku: order.variant.sku,
          copies: 1,
          sizing: 'fillPrintArea',
          attributes: { color: order.variant.color, size: order.variant.size },
          recipientCost: { amount: (order.amountCents / 100).toFixed(2), currency: 'USD' },
          assets: [{ printArea: 'front', url: assetUrl }],
        },
      ],
      idempotencyKey: order.idempotencyKey,
      callbackUrl: `${base}/api/webhooks/prodigi`,
      metadata: {
        internalOrderId: order.id,
      },
    });
    const prodigiOrderId = resp?.order?.id ?? resp?.orders?.[0]?.id ?? resp?.id;
    orders.update(order.id, { status: 'prodigi_submitted', prodigiOrderId });
    // Re-fetch to confirm we can read back
    let fetchBack: any = null;
    if (prodigiOrderId) {
      try { fetchBack = await getProdigiOrder(prodigiOrderId); } catch { /* ignore */ }
    }
    return NextResponse.json({
      ok: true,
      orderId: order.id,
      prodigiOrderId,
      prodigiResponse: resp,
      assetFetch: { status: fetchStatus, contentType },
      prodigiFetchBack: fetchBack,
    });
  } catch (e: any) {
    orders.update(order.id, { status: 'prodigi_failed' });
    return NextResponse.json({
      ok: false,
      error: e?.message ?? String(e),
      assetFetch: { status: fetchStatus, contentType },
    }, { status: 500 });
  }
}
