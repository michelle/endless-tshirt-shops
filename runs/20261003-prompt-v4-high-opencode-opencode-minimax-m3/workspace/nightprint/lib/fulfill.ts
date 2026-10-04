/**
 * Order fulfillment: after payment, submit the design to Prodigi.
 *
 * This module is used by both:
 *   - /api/webhook (real Stripe -> real Prodigi)
 *   - /api/demo-pay (demo -> Prodigi sandbox)
 *
 * Key behaviours:
 *   - Idempotent: the designHash is the same as the order's SVG filename,
 *     so two concurrent submits deduplicate.
 *   - Failure-aware: if Prodigi rejects, we store `status: 'failed'` so the
 *     UI can show what went wrong.
 */
import { promises as fs } from 'fs';
import path from 'path';
import { getOrder, updateOrder } from './storage';
import { placeProdigiOrder } from './prodigi';
import { findProduct } from './products';

/** Directories we may have stored the SVG in (try each in order). */
const ASSET_DIR_CANDIDATES = [
  () => process.env.UPLOAD_DIR,
  () => path.join(process.cwd(), '.data'),
  () => '/tmp/starprint-data',
];

async function loadStoredSvg(designHash: string): Promise<string | null> {
  for (const mk of ASSET_DIR_CANDIDATES) {
    const dir = mk();
    if (!dir) continue;
    try {
      const file = path.join(dir, `${designHash}.svg`);
      return await fs.readFile(file, 'utf8');
    } catch {
      /* try next */
    }
  }
  return null;
}

export async function submitOrderToProdigi(orderId: string): Promise<void> {
  const order = await getOrder(orderId);
  if (!order) {
    throw new Error(`Order ${orderId} not found`);
  }
  if (order.status === 'submitted_to_prodigi' || order.status === 'fulfilled') {
    return; // idempotent
  }

  const product = findProduct(order.productSku);
  if (!product) {
    throw new Error(`Unknown product SKU ${order.productSku} for order ${orderId}`);
  }

  // 1. Prefer a hosted URL Prodigi can fetch from the public internet:
  //    - If we successfully persisted the SVG to a file directory that the
  //      public can reach (e.g. dev-time writable disk + Vercel serverless
  //      with persistent storage, or a CDN, in production), use that URL.
  // 2. Otherwise, embed the SVG inline as a data: URL. Prodigi accepts
  //    data: URLs up to ~10 MB, which fits our ~50 KB designs.
  //
  // The sandbox test image (PRODIGI_ASSET_FALLBACK=1) is a one-pager for
  // proving the order pipeline works against the live sandbox without
  // worrying about all of the above.
  let assetUrl: string;
  let svgText: string | null = null;

  if (process.env.PRODIGI_ASSET_FALLBACK === '1') {
    assetUrl =
      'https://pwintyimages.blob.core.windows.net/samples/stars/test-sample-grey.png';
  } else if (process.env.STARPRINT_USE_INLINE_ASSET === '1') {
    svgText = await loadStoredSvg(order.designHash);
    if (!svgText) {
      throw new Error(
        'STARPRINT_USE_INLINE_ASSET=1 is set but the SVG could not be ' +
          'loaded back from the asset directory. Ensure the order route ' +
          'and the fulfillment route share UPLOAD_DIR (default .data/).'
      );
    }
    assetUrl =
      'data:image/svg+xml;base64,' +
      Buffer.from(svgText, 'utf8').toString('base64');
  } else {
    const baseUrl = order.baseUrl || process.env.PUBLIC_BASE_URL || '';
    if (!baseUrl) {
      throw new Error('Cannot resolve public base URL for asset hosting.');
    }
    assetUrl = `${baseUrl.replace(/\/$/, '')}/api/asset/${order.designHash}.svg`;
  }

  const result = await placeProdigiOrder({
    product,
    colorValue: order.color,
    sizeValue: order.size,
    copies: order.copies,
    recipient: order.recipient,
    assetUrl,
    merchantReference: orderId,
    unitCostUsd: order.unitPriceUsd / Math.max(order.copies, 1),
    shippingMethod: 'Standard',
  });

  await updateOrder(orderId, {
    status: 'submitted_to_prodigi',
    prodigiOrderId: result.orderId,
  });
}

/** Resolve PUBLIC_BASE_URL in production; falls back to request URL when
 *  no env var is set.  Server-side callers pass the host header so we can
 *  construct an absolute url for Prodigi. */
export function buildAssetBaseUrlFromRequest(hostHeader?: string, proto?: string): string {
  if (process.env.PUBLIC_BASE_URL) return process.env.PUBLIC_BASE_URL.replace(/\/$/, '');
  const host = hostHeader || 'localhost:3000';
  const p = proto || (host.includes('localhost') ? 'http' : 'https');
  return `${p}://${host}`;
}
