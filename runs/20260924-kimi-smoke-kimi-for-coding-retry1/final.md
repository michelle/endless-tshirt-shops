Done. **SKYWRITER** is built and deployed — a custom star-map t-shirt store where every shirt is individually computed for the customer.

**Live at: https://benchmark-20260924-kimi-smoke-kimi.vercel.app** (Vercel project `benchmark-20260924-kimi-smoke-kimi-for-coding-retry1`, production)

## The concept

Customers enter a date, time, and place — a first kiss, a birth, a graduation night. The app computes the *actual* sky for that moment and location (1,716 stars from the Yale Bright Star Catalogue with constellation figures, plus the moon's real phase, via proper sidereal-time math), renders it with the customer's caption ("NEW YORK, USA — the night we met"), and DTG-prints it full-chest on a Bella+Canvas 3001. Ten dark shirt colors, sizes XS–3XL, $34.99 + $4.95 shipping (free $75+).

## How to test it

1. Open the URL, customize a sky (try the "find place" helper), add to cart, check out.
2. Checkout runs in **sandbox payment mode** (clearly labeled): no Stripe keys were provisioned in this environment, so payment is simulated and the full pipeline — including a real order in the **Prodigi sandbox** — executes on pay. Nothing is charged, nothing is printed.
3. The confirmation page polls Prodigi live and shows print status. Verify the order yourself: `curl -H "X-API-Key: $PRODIGI_API_KEY" https://api.sandbox.prodigi.com/v4.0/orders?merchantReferences=<ref>`.
4. One-click deployment health check: `GET /api/selftest` on the site returns a JSON report (env config → homepage → artwork PNG → full sandbox order → status read-back). All four steps pass.
5. Artwork endpoint: `GET /api/artwork/<signed>.png` regenerates the exact 4680×5790 (300 DPI) print file statelessly from an HMAC-signed URL — that's what Prodigi fetches, so no file storage is needed.

## Architecture highlights

- **Payment-gated fulfillment:** the only paths to Prodigi are (a) the Stripe webhook on signature-verified `checkout.session.completed`, or (b) the explicitly-enabled sandbox-pay path. Stripe Checkout carries each design in line-item metadata; Prodigi orders use idempotency keys, so webhook retries can't duplicate orders. The app is deliberately database-free (Stripe session + Prodigi API are the records).
- **Print rendering** uses Skia (@napi-rs/canvas) with embedded EB Garamond fonts — full-res PNG in <1s, and the browser preview shares the same drawing code.

## Known gaps

- **Payments are in sandbox mode.** The Vercel project already holds `STRIPE_SECRET_KEY` + publishable key (from a prior run), but no `STRIPE_WEBHOOK_SECRET`, so real card collection stays disabled. I could not verify the deployed site's pages from this machine — the sandbox network blocks all `*.vercel.app` TLS — verification rests on the passing local end-to-end runs (three real Prodigi sandbox orders created and read back) plus the deployed `/api/selftest`.
- Prodigi sandbox doesn't download artwork or send callbacks, so asset-fetch and callback handling are exercised only in shape. Nominatim geocoding is used without an API key (fine at demo volume).
- No order database (by design), no tax calculation, no email receipts, single product, ~10 shirt colors.

## To take it to production

1. In the Stripe dashboard, create a webhook → `https://<domain>/api/webhooks/stripe` for `checkout.session.completed`; set `STRIPE_WEBHOOK_SECRET` in Vercel (the other two Stripe vars are already there).
2. Set `ENABLE_SANDBOX_CHECKOUT=false`, remove/lock `/api/selftest` and `/api/pay/sandbox`.
3. Swap `PRODIGI_API_KEY` for your **live** Prodigi key and set `PRODIGI_BASE=https://api.prodigi.com/v4.0`.
4. Point `SITE_URL` at your real domain (add it in Vercel); enable Stripe Tax; review shipping countries in `app/api/checkout/route.js`.
5. Full runbook is in the repo's `README.md`; source lives in `benchmark-20260924-kimi-smoke-kimi-for-coding-retry1/` in the workspace.
