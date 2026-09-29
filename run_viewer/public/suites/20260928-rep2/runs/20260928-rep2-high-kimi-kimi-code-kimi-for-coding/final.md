Done. **Echostitch** — a fully-customized DTG t-shirt store — is live.

**Live URL:** https://benchmark-20260928-rep2-high-kimi-k.vercel.app (Vercel project `benchmark-20260928-rep2-high-kimi-kimi-code-kimi-for-coding`, production deployment Ready)

## The concept
Every shirt is printed from a sound the customer captures: record in the browser, upload an audio file, or use the built-in demo (a Morse-tone spelling of "LOVE"). The audio becomes a 480-point waveform that's rendered as high-res DTG artwork — two styles (pulse line / mountain fill), 6 garment colors, 6 ink colors, sizes XS–3XL. Change one millisecond of audio and the shape changes: genuinely one-of-one, which is what DTG is good at. $36 (+$3 for 2XL/3XL), free shipping.

## How it works (and how it was verified)
1. Browser captures audio → 480 amplitude samples (client-side, Web Audio API).
2. `POST /api/checkout` validates the design and stores it in Stripe Checkout session metadata (tamper-proof, stateless).
3. Stripe Checkout collects payment + shipping address.
4. **Only after the webhook sees `payment_status: paid`** does `/api/webhook` render the 3000×3600 transparent PNG, host it at `/api/print/<session>.png`, and submit the order to Prodigi (SKU `GLOBAL-TEE-BC-3001`, idempotency-key = session ID, so retries can't double-order).
5. The order-status page polls `/api/order-status`, which reads Prodigi live — stage, lab-generated shirt mockup, and tracking link when shipped.

Verified end-to-end in production: signed webhook → Prodigi order `ord_1175100` created with **zero issues**, and Prodigi's lab successfully **downloaded the print file from our domain** (`downloadAssets: Complete`). Also verified: PNG output of both styles visually, checkout page loads, invalid-signature webhooks rejected, idempotent re-delivery.

## How you can test it
1. Open the URL, hit **Record** (allow mic) or **Upload**, or click **Demo phrase** — watch the preview update.
2. Pick style/colors/size → **Buy** → Stripe **test-mode** checkout. Use card `4242 4242 4242 4242`, any future expiry, any CVC/ZIP, plus a name and (plausible) address.
3. You're redirected back to a live order-status panel: payment → sent to print lab → Prodigi order ID → lab mockup and tracking appear as the sandbox lab processes it (takes ~10–20 min to reach "Complete").
4. Headless re-run anytime: `BASE_URL=https://… node scripts/e2e-test.mjs` (signed-webhook simulation, no browser).

## Known gaps
- **Stripe is test mode** — I provisioned a claimable Stripe sandbox (`stripe sandbox create`; expires 2026-10-05). Test cards only; no real money.
- **Prodigi is sandbox** — nothing actually prints or ships; orders simulate the full lifecycle.
- **No persistent DB** — orders live in Stripe session metadata by design; status page needs the `session_id` link. No order history, admin, or customer emails.
- Single product, quantity 1, no cart. Mic recording needs browser permission (HTTPS provided). XS unavailable in some garment colors (UI handles it). Two stale sandbox orders from a mid-build bug couldn't be cancelled (harmless artifacts).

## To take it to production
1. **Stripe:** claim the sandbox or create a live account → live `STRIPE_SECRET_KEY` in Vercel env → create a *live* webhook endpoint to `https://<your-domain>/api/webhook` (`SITE_URL=… node scripts/setup-stripe-webhook.mjs` handles registration + secret) → redeploy. Enable Stripe email receipts.
2. **Prodigi:** live API key from dashboard.prodigi.com → set `PRODIGI_API_KEY` + `PRODIGI_ENV=live` → add billing. (`lib/prodigi.ts` already switches base URL.)
3. **Domain:** `vercel domains add`, then set `NEXT_PUBLIC_SITE_URL` so print-file URLs use the canonical domain (currently derived from the request host — works fine on the `.vercel.app` alias).
4. **Storefront hardening:** order persistence (Vercel Postgres/Neon), rate-limit `/api/checkout`, terms/privacy/contact pages, Stripe Tax, and a cost check — Prodigi's sandbox cost was ~$16.56 vs the $36 price.
