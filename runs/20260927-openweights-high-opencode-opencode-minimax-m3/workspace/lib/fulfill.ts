// Shared fulfillment pipeline used by both /api/webhook and the demo
// checkout. Side-effects:
//   1. Render the print PNG (server-side, 300 DPI).
//   2. Upload to a public URL so Prodigi can fetch it. In production this is
//      a Vercel Blob or S3 URL; for the sandbox demo a Next.js public asset
//      is fine because Prodigi only pulls it once.
//   3. POST /v4.0/orders to Prodigi.

import { renderPrintPng, type Customization } from "./render";
import { createProdigiOrder, type Recipient } from "./prodigi";
import { sign } from "./tokens";

export async function buildPrintPngBuffer(c: Customization): Promise<Buffer> {
  return renderPrintPng(c);
}

/**
 * Persist the rendered PNG so Prodigi can fetch it later. Returns the public URL.
 *
 * Strategy: write the PNG to /api/glyph/<token> which returns it on demand. Since
 * Prodigi only fetches once, this works as long as the deployed app stays live.
 * For production, swap this for a Vercel Blob upload or an S3 URL.
 */
export async function storePrintForProdigi(c: Customization, baseUrl: string): Promise<string> {
  const token = sign(c);
  return `${stripTrailingSlash(baseUrl)}/api/glyph/${encodeURIComponent(token)}`;
}

function stripTrailingSlash(u: string): string {
  return u.endsWith("/") ? u.slice(0, -1) : u;
}

export interface FulfillmentInput {
  customization: Customization;
  recipient: Recipient;
  stripeSessionId: string;
  callbackUrl?: string;
}

export async function fulfillPaidOrder(input: FulfillmentInput, opts?: { baseUrlOverride?: string }) {
  const baseUrl =
    opts?.baseUrlOverride ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    "http://localhost:3000";

  const assetUrl = await storePrintForProdigi(input.customization, baseUrl);

  return createProdigiOrder({
    customization: input.customization,
    recipient: input.recipient,
    assetUrl,
    merchantReference: input.stripeSessionId,
    idempotencyKey: input.stripeSessionId,
    callbackUrl: input.callbackUrl,
  });
}
