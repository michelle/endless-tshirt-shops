/**
 * /api/order - Create an order record + persist design PNG.
 *
 * The customer lands here from the customize page. We:
 *   1. Persist the design input on the server.
 *   2. Render the print-size PNG once and store it for Prodigi to fetch.
 *   3. Create a Stripe Checkout session (or queue for demo payment).
 *   4. Return the redirect URL the UI should navigate to.
 *
 * The actual `POST /api/webhook` is what triggers the Prodigi order, so
 * if Stripe fails entirely we still have the design kept server-side.
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  generateSvg,
  PRINT_W,
  PRINT_H,
  type DesignInput,
} from '@/lib/design';
import { COLORS, SIZES, findProduct, formatPrice, defaultSku } from '@/lib/products';
import { persistSvgAsset, assetUrl as assetUrlFor, dataUrlForSvg } from '@/lib/asset';
import { getStripe, isStripeConfigured, stripeMode } from '@/lib/stripe';
import {
  storeOrder,
  newOrderId,
  hashDesign,
  type StoredOrder,
} from '@/lib/storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RecipientSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.object({
    line1: z.string().min(1).max(120),
    line2: z.string().max(120).optional(),
    townOrCity: z.string().min(1).max(80),
    stateOrCounty: z.string().max(80).optional(),
    postalOrZipCode: z.string().min(2).max(20),
    countryCode: z.string().length(2),
  }),
});

const OrderSchema = z.object({
  design: z.object({
    when: z.union([z.string(), z.number(), z.string().datetime()]),
    latitudeDeg: z.number(),
    longitudeDeg: z.number(),
    locationName: z.string().max(120),
    message: z.string().max(400),
    headline: z.string().max(80).optional(),
    palette: z.enum(['ink', 'ivory', 'rose', 'sage']).optional(),
  }),
  productSku: z.string().default(defaultSku()),
  color: z.enum(COLORS.map((c) => c.value) as [string, ...string[]]),
  size: z.enum(SIZES.map((s) => s.value) as [string, ...string[]]),
  copies: z.number().int().min(1).max(20).default(1),
  recipient: RecipientSchema,
});

interface CreatedOrderResponse {
  orderId: string;
  stripeMode: 'live' | 'test' | 'demo';
  checkoutUrl: string;
  status: 'created';
}

export async function POST(req: Request): Promise<NextResponse<CreatedOrderResponse | { error: string }>> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  let parsed: z.infer<typeof OrderSchema>;
  try {
    parsed = OrderSchema.parse(body);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'invalid input' }, { status: 400 });
  }

  // Diagnostic hook to surface server-side errors during deploys without
  // making them visible in production behavior.
  const debugTrap = (where: string, err: any) => {
    if (process.env.NODE_ENV !== 'production' || process.env.STARPRINT_DEBUG) {
      console.error(`[order] ${where}:`, err?.message ?? err);
    }
  };

  const design: DesignInput = {
    when: typeof parsed.design.when === 'number'
      ? new Date(parsed.design.when)
      : new Date(parsed.design.when),
    latitudeDeg: parsed.design.latitudeDeg,
    longitudeDeg: parsed.design.longitudeDeg,
    locationName: parsed.design.locationName,
    message: parsed.design.message,
    headline: parsed.design.headline,
    palette: parsed.design.palette,
  };

  const product = findProduct(parsed.productSku);
  if (!product) {
    return NextResponse.json({ error: 'unknown product sku' }, { status: 400 });
  }

  const colorRow = COLORS.find((c) => c.value === parsed.color);
  const sizeRow = SIZES.find((s) => s.value === parsed.size);
  if (!colorRow || !sizeRow) {
    return NextResponse.json({ error: 'invalid color or size' }, { status: 400 });
  }

  // Render the design as an SVG and persist it. Prodigi accepts SVG natively,
  // so we don't need to rasterize to PNG on the server.
  let svg: string;
  try {
    const r = generateSvg(design, { width: PRINT_W, height: PRINT_H });
    svg = r.svg;
  } catch (err: any) {
    debugTrap('generateSvg', err);
    return NextResponse.json({ error: 'design render failed: ' + (err?.message ?? 'unknown') }, { status: 500 });
  }

  const orderId = newOrderId();
  const designHash = hashDesign(svg);

  try {
    await persistSvgAsset(designHash, svg);
  } catch (err: any) {
    // The asset persistence step is best-effort. If the FS is read-only
    // (typical of serverless runtimes), we fall back to passing the SVG
    // inline as a `data:image/svg+xml` URL, which Prodigi accepts.
    if (process.env.STARPRINT_DEBUG) {
      debugTrap('persist', err);
    }
  }

  const baseUrl = await publicBaseUrl(req);
  let assetUrl: string;
  // Use the public-host URL when we can. If we don't have a publicBaseUrl
  // (or we know the file system is read-only and baseUrl points at a
  // request the asset URL won't be reachable from Prodigi's servers), we
  // pass the SVG inline.
  const useInline = process.env.STARPRINT_USE_INLINE_ASSET === '1' || !baseUrl;
  if (useInline) {
    assetUrl = dataUrlForSvg(svg);
  } else {
    assetUrl = assetUrlFor(baseUrl, designHash, 'svg');
  }

  const totalUsd = product.retailUsd * parsed.copies;
  const unitCostUsd = totalUsd;

  const storedOrder: StoredOrder = {
    id: orderId,
    createdAt: new Date().toISOString(),
    designHash,
    design,
    productSku: product.sku,
    color: colorRow.prodigiName,
    size: sizeRow.value,
    copies: parsed.copies,
    recipient: parsed.recipient,
    unitPriceUsd: unitCostUsd,
    status: 'draft',
    baseUrl: baseUrl,
  };
  await storeOrder(storedOrder);

  const successUrl = `${baseUrl}/success?orderId=${orderId}&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${baseUrl}/design`;

  // Build checkout session, or use the demo flow
  if (isStripeConfigured()) {
    const stripe = getStripe()!;
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          quantity: parsed.copies,
          price_data: {
            currency: 'usd',
            unit_amount: Math.round(product.retailUsd * 100),
            product_data: {
              name: `${product.brand} ${product.name} - Personalized`,
              description: `${design.locationName} \u00B7 ${
                new Date(design.when).toISOString().slice(0, 10)
              } \u00B7 ${colorRow.label} \u00B7 ${sizeRow.label}`,
              images: [`${baseUrl}/api/preview?format=png&size=preview`],
              metadata: {
                designHash,
                orderId,
              },
            },
          },
        },
      ],
      customer_email: parsed.recipient.email || undefined,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        orderId,
        designHash,
        productSku: product.sku,
        unitCostUsd: String(unitCostUsd),
      },
      shipping_address_collection: {
        allowed_countries: [
          'US', 'CA', 'GB', 'AU', 'DE', 'FR', 'NL', 'BE', 'IE', 'IT', 'ES',
          'PT', 'AT', 'CH', 'SE', 'NO', 'DK', 'FI', 'PL', 'NZ', 'JP',
          'SG', 'HK', 'BR', 'MX',
        ],
      },
    });

    await storeOrder({ ...storedOrder, stripeSessionId: session.id });

    return NextResponse.json({
      orderId,
      stripeMode: stripeMode(),
      checkoutUrl: session.url!,
      status: 'created',
    });
  }

  // Demo: stage the order ready for the demo-pay route.
  return NextResponse.json({
    orderId,
    stripeMode: stripeMode(),
    checkoutUrl: `${baseUrl}/api/demo-pay?orderId=${orderId}`,
    status: 'created',
  });
}

/** Best-effort absolute URL for the running site. */
async function publicBaseUrl(req: Request): Promise<string> {
  if (process.env.PUBLIC_BASE_URL) return process.env.PUBLIC_BASE_URL.replace(/\/$/, '');
  // Derive from request (Vercel-friendly)
  const url = new URL(req.url);
  const host =
    req.headers.get('x-forwarded-host') ??
    req.headers.get('host') ??
    url.hostname;
  const proto =
    req.headers.get('x-forwarded-proto') ??
    (host && host.includes('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}

export async function GET() {
  return NextResponse.json({ error: 'POST only' }, { status: 405 });
}
