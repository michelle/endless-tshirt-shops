import { NextRequest, NextResponse } from 'next/server';
import { renderDesign } from '@/lib/design-renderer';
import { orders } from '@/lib/orders';
import { assetCache } from '@/lib/asset-cache';
import { SHIRTS, INK_HEX } from '@/lib/products';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Public asset endpoint. Prodigi will fetch this URL to download the
 * design PNG after we submit the order. We render the PNG on demand
 * from the order record so we never need persistent storage.
 */
export async function GET(_req: NextRequest, ctx: { params: { orderId: string } }) {
  const { orderId } = ctx.params;
  const order = orders.get(orderId);
  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }
  // Authorize: either an explicit token in the query (Prodigi side) OR
  // status is at least paid_production. Preview is allowed only if the
  // explicit token is present (so customer can see what we printed).
  const token = _req.nextUrl.searchParams.get('t');
  const allowed = order.status === 'paid_production' || order.status === 'prodigi_submitted' || order.status === 'fulfilled' || token === order.idempotencyKey;
  if (!allowed) {
    return NextResponse.json({ error: 'Not ready' }, { status: 403 });
  }

  const cached = assetCache.byOrderId(orderId);
  if (cached) {
    return new NextResponse(new Uint8Array(cached.buf), {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': token ? 'public, max-age=600' : 'private, max-age=60',
        'X-Print-Width-Px': String(cached.width),
        'X-Print-Height-Px': String(cached.height),
      },
    });
  }

  // Re-render from the order record.
  const shirt = SHIRTS.find((s) => s.color === order.variant.color);
  if (!shirt) {
    return NextResponse.json({ error: 'Unknown shirt color' }, { status: 500 });
  }
  const inkColor = shirt.ink === 'light' ? INK_HEX.light : INK_HEX.dark;
  const background = shirt.ink === 'light' ? 'dark' : 'light';
  try {
    const { png, width, height } = await renderDesign({
      design: order.design, inkColor, background,
    });
    assetCache.set(`${order.idempotencyKey}-${order.variant.color}-${order.variant.size}`, orderId, png, width, height);
    return new NextResponse(new Uint8Array(png), {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': token ? 'public, max-age=600' : 'private, max-age=60',
        'X-Print-Width-Px': String(width),
        'X-Print-Height-Px': String(height),
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: 'render failed', message: String(e?.message ?? e) }, { status: 500 });
  }
}
