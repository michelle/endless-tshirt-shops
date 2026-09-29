The build is complete, deployed, and verified end-to-end. Here's the full picture:

## What I built

**Nightshift — "the sky above the moment that mattered."** A one-of-one DTG t-shirt store: the customer picks a place and a moment (first meeting, a birth, a last night), and the app computes the actual night sky at that exact instant — 2,189 catalog stars sized by magnitude, 89 IAU constellation figures, and the Moon with its true phase and position, resolved in the customer's own timezone (DST included, via IANA rules). The live preview and the 3600×4800 px (12″×16″ @ 300 DPI) print file are the **same renderer**, so what the customer approves is exactly what ships. No two shirts can ever be alike — that's the DTG concept taken literally.

**Live at:** https://benchmark-20260928-rep2-high-nightshift.vercel.app

**Stack:** static dependency-free front end (`public/`) + 5 Vercel serverless functions (`api/`), zero runtime dependencies except the official `@vercel/blob` client. Payments via **Stripe Checkout** (hand-rolled REST, no SDK); fulfillment via **Prodigi v4** (`GLOBAL-TEE-BC-3001`, Bella+Canvas 3001, front print, `fillPrintArea`). Prices are always computed server-side; the full order rides through Stripe metadata, so fulfillment re-reads exactly what was paid for.

**The payment gate** (the core requirement): `api/_lib/fulfill.js` is the only path to Prodigi, and it runs exclusively after Stripe reports `payment_status === 'paid'` — re-fetched from Stripe on every call, never taken from the client. It's triple-guarded: the paid-check, a Prodigi idempotency key derived from the Stripe PaymentIntent (races collapse into one physical order), and a fulfillment marker written back to the PaymentIntent.

## How to test it

1. **Manual:** open the URL → search a place ("Cape May") → pick a date/time (try 1991-06-14 23:42) → choose style/shirt/size → *Continue to shipping* → fill the address → *Pay with card*. On Stripe use the standard test card **4242 4242 4242 4242**, any future expiry, any CVC. The success page confirms with a **Prodigi order id** (`ord_…`) and a keepsake render of the shirt.
2. **Automated E2E** (drives a real browser through the whole pipeline, including payment):
   ```sh
   NODE_PATH=<playwright's node_modules> node tools/e2e.mjs https://benchmark-20260928-rep2-high-nightshift.vercel.app
   ```
   I ran it twice — both passed (orders `ord_1175115`, `ord_1175116`, correct items/attributes/quantities in Prodigi, assets downloaded, idempotent re-checks).
3. **Unit tests:** `npm test` — 17 tests, including astronomy pinned to Schlyter's published worked examples (Sun/Moon/GMST/alt-az vs. the Astronomical Almanac), pricing, validation, webhook signatures, and the Prodigi payload shape.
4. **Webhook path:** `stripe listen --api-key <key> --forward-to …/api/webhooks/stripe`, set the printed `whsec_…` as `STRIPE_WEBHOOK_SECRET`, buy again — the logs show the signature-verified `checkout.session.completed` fulfilling the order (it won this race in my test; the success-page path then no-op'd idempotently). Unsigned webhook posts get a 400.

## Known gaps

1. **Webhooks while unattended** — no endpoint is registered in the Stripe dashboard (needs a real account); until then, fulfillment fires from the success page or while a `stripe listen` tunnel runs. A customer who closes the tab *exactly* between payment and redirect is missed until the webhook is registered.
2. **Everything is sandbox** — the Stripe sandbox keys expire **Oct 5** (claim URL issued at creation), and Prodigi sandbox orders never physically print or ship.
3. **Print uploads are unauthenticated** — anyone can store PNGs in the blob store; orphaned uploads from abandoned carts are never cleaned. Only URLs from this project's own store are accepted at checkout, so it can't affect orders.
4. **No local order database** — order state deliberately lives in Stripe/Prodigi; no email receipts from the store itself, no admin surface.
5. **Refunds aren't wired** to Prodigi cancellation (possible while an order is still `InProgress`); shipping is two flat tiers, no tax.
6. The design leans on Google Fonts + Open-Meteo geocoding at runtime (both degrade gracefully — geocoding has a manual-coordinates fallback).

## To bring it to production

1. Swap in a **live Stripe account** (real secret key + webhook endpoint in the dashboard, set `STRIPE_WEBHOOK_SECRET` from it) and a **live Prodigi API key** — the code auto-selects `api.prodigi.com` for non-`test_` keys.
2. Register a real domain (Vercel Authentication currently protects `*.vercel.app` on this team account; I disabled it for this run's project to make the store publicly reachable — re-enable for a private staging project).
3. Add rate limiting + a blob lifecycle rule for orphaned prints, order/receipt emails, a refund→Prodigi-cancel path, tax, and destination-based shipping quotes (Prodigi's quote API).
4. Watch `vercel logs` for the structured `log()` lines (checkout/fulfillment events) — wire them to an alerting sink.

Everything is committed in the workspace (3 commits), all 17 tests pass, and the deployed build is exactly the committed HEAD.
