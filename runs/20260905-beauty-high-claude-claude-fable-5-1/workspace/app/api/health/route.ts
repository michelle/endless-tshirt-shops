import { NextResponse } from "next/server";
import { stripe, stripeConfigured } from "@/lib/stripe";
import { getProduct, prodigiConfigured, prodigiIsSandbox } from "@/lib/prodigi";
import { STYLE_INFO } from "@/lib/catalog";
import { siteUrl } from "@/lib/site";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/health — is everything wired up? */
export async function GET(req: Request) {
  const checks: Record<string, { ok: boolean; detail?: string }> = {};

  checks.stripe = { ok: false };
  if (stripeConfigured()) {
    try {
      await stripe().checkout.sessions.list({ limit: 1 });
      checks.stripe = { ok: true, detail: "checkout sessions readable" };
    } catch (err) {
      checks.stripe = { ok: false, detail: (err as Error).message };
    }
  } else {
    checks.stripe.detail = "STRIPE_SECRET_KEY / NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY missing";
  }

  checks.stripeWebhook = {
    ok: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
    detail: process.env.STRIPE_WEBHOOK_SECRET ? "secret configured" : "STRIPE_WEBHOOK_SECRET missing — thank-you page fallback will fulfil instead",
  };

  checks.prodigi = { ok: false };
  if (prodigiConfigured()) {
    try {
      await getProduct(STYLE_INFO.unisex.sku);
      checks.prodigi = { ok: true, detail: `${prodigiIsSandbox() ? "sandbox" : "LIVE"} · ${STYLE_INFO.unisex.sku} resolvable` };
    } catch (err) {
      checks.prodigi = { ok: false, detail: (err as Error).message };
    }
  } else {
    checks.prodigi.detail = "PRODIGI_API_KEY missing";
  }

  const base = siteUrl(new URL(req.url).origin);
  checks.artwork = { ok: /^https:\/\//.test(base), detail: `${base}/art/<ts>.png — must be public for Prodigi` };

  const ok = Object.values(checks).every((c) => c.ok);
  return NextResponse.json({ ok, now: Date.now(), baseUrl: base, checks }, { status: ok ? 200 : 503 });
}
