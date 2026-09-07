import { NextRequest, NextResponse } from 'next/server';
import { PRODUCT_MAP, PRODIGI_SKU, SIZES, type ProductId } from '@/lib/catalog';

type IncomingCartItem = { productId?: ProductId; size?: string; quantity?: number };
type IncomingRecipient = { name?: string; email?: string; line1?: string; line2?: string; city?: string; state?: string; postalCode?: string; countryCode?: string };

export async function POST(request: NextRequest) {
  if (!process.env.PRODIGI_API_KEY) return NextResponse.json({ error: 'Prodigi sandbox is not configured.' }, { status: 503 });

  try {
    const body = await request.json() as { cart?: IncomingCartItem[]; recipient?: IncomingRecipient };
    const cart = body.cart;
    const recipient = body.recipient;
    if (!Array.isArray(cart) || cart.length < 1 || cart.length > 12) return NextResponse.json({ error: 'Your bag is empty or too large.' }, { status: 400 });
    if (!recipient || !recipient.name || !recipient.email || !recipient.line1 || !recipient.city || !recipient.postalCode || !recipient.countryCode) return NextResponse.json({ error: 'Please complete the shipping details.' }, { status: 400 });
    if (!/^[A-Z]{2}$/.test(recipient.countryCode)) return NextResponse.json({ error: 'Please choose a valid country.' }, { status: 400 });

    const origin = request.nextUrl.origin;
    const items = cart.map((item, index) => {
      const product = item.productId ? PRODUCT_MAP[item.productId] : undefined;
      const quantity = Number(item.quantity);
      if (!product || !item.size || !SIZES.includes(item.size as typeof SIZES[number]) || !Number.isInteger(quantity) || quantity < 1 || quantity > 8) throw new Error('Your bag contains an invalid item.');
      return {
        merchantReference: `${product.id}-${item.size}-${index + 1}`,
        sku: PRODIGI_SKU,
        copies: quantity,
        sizing: 'fitPrintArea',
        attributes: { color: product.prodigiColor, size: item.size },
        recipientCost: { amount: (product.price * quantity).toFixed(2), currency: 'USD' },
        assets: [{ printArea: 'front', url: `${origin}${product.art}` }],
      };
    });

    const prodigiResponse = await fetch('https://api.sandbox.prodigi.com/v4.0/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': process.env.PRODIGI_API_KEY },
      body: JSON.stringify({
        merchantReference: `elsewhere-${Date.now()}`,
        shippingMethod: 'Budget',
        recipient: {
          name: recipient.name, email: recipient.email,
          address: {
            line1: recipient.line1, line2: recipient.line2 || undefined,
            postalOrZipCode: recipient.postalCode, countryCode: recipient.countryCode,
            townOrCity: recipient.city, stateOrCounty: recipient.state || undefined,
          },
        },
        items,
      }),
      cache: 'no-store',
    });
    const data = await prodigiResponse.json() as { outcome?: string; order?: { id?: string }; issues?: Array<{ description?: string }> };
    if (!prodigiResponse.ok || !data.order?.id) {
      const detail = data.issues?.map((issue) => issue.description).filter(Boolean).join(' ') || 'Prodigi rejected the sandbox order.';
      return NextResponse.json({ error: detail }, { status: 502 });
    }
    return NextResponse.json({ orderId: data.order.id, outcome: data.outcome || 'Ok' });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'The order could not be created.' }, { status: 400 });
  }
}
