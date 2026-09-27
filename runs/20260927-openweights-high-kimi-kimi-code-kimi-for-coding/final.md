Done. The store is live, fully tested end-to-end, and printing pipeline verified against Prodigi's sandbox.

## What I built

**DEFINING.ME** — a "personal dictionary definition" tee. The customer types any name; a dictionary entry (headword, part of speech, definition, example sentence, est. year, limited edition number) is auto-written or fully hand-written, then typeset as a classic dictionary page and DTG-printed. Every shirt is unique — a good DTG use case. Bella + Canvas 3001, 8 sizes, 12 garment colors, 5 accent colors, live tee mockup preview. $34 + $4.95 worldwide shipping.

**Stack:** Next.js 16 (App Router) on Vercel, Stripe Checkout (payment provider), Prodigi Print API v4 (`GLOBAL-TEE-BC-3001`, front print 4680×5790 @300dpi). Print PNGs are generated on-demand as deterministic SVG→PNG renders (Playfair Display, OFL), so no storage is needed.

**Payment-before-fulfillment flow:** `POST /api/checkout` → Stripe Checkout (collects shipping + phone) → `checkout.session.completed` webhook (signature-verified) → order submitted to Prodigi only when `payment_status === "paid"`, with idempotency (Stripe session ID as Prodigi idempotency key + duplicate check — verified: re-delivery creates no duplicate). Confirmation and production tracking pages read back from Stripe/Prodigi live.

## How to test it

- Store: **https://definingme-store.vercel.app/** (Vercel project `benchmark-20260927-...-kimi-for-coding`, alias attached since the project name exceeds the subdomain limit)
- Design a shirt, click Buy, and pay with Stripe **test card** `4242 4242 4242 4242`, any future expiry, any CVC/ZIP (test mode — no real charge). Enter any address in an allowed country — it becomes the Prodigi shipping address.
- After payment, the success page shows your order; "Track production & shipping" (also under Track an order) shows Prodigi's stages. Give it a minute or two to appear.
- Verified myself on the live deployment: a real order reached `inProduction` with `downloadAssets: Complete` — Prodigi successfully pulled the generated artwork from the site — plus a real Stripe-triggered event delivered to the webhook and passed signature verification.

## Gaps you should know about

- **Test-mode everything:** Stripe is in test mode and Prodigi is sandbox — nothing is charged and nothing physically ships. The Stripe key is a sandbox account already present on this machine (from a prior run's CLI login; account valid to ~Oct 4 2026, key to ~Dec 2026). Treat it as shared/borrowed.
- **No tax collection** — Stripe Tax is off; Prodigi's quote explicitly excludes US sales tax.
- **No order database** — tracking works off the Stripe session reference (`cs_...`, shown on the success page and Stripe receipt). No account history or email lookup.
- **Flat shipping rate** ($4.95 "Standard") regardless of destination; no express options.
- **No app-level emails** (Stripe sends receipts only for live payments), no content moderation on custom definitions, mockup is a stylized SVG (not photo-real), 12 of 30 garment colors offered.
- Webhook processing is synchronous inside the Stripe webhook; fine at low volume.
- Key material is in `<workspace>/.stripe-account` and `<workspace>/.stripe-webhook-secret`; code is in `<workspace>/store/`.

## To take it to production

1. **Stripe:** create your own account → live keys → set `STRIPE_SECRET_KEY` and a live `STRIPE_WEBHOOK_SECRET` (re-create the webhook endpoint for your domain; update the existing endpoint URL if you keep this project). Consider enabling Stripe Tax and adding your business details/statement descriptor.
2. **Prodigi:** get a live API key from the dashboard → set `PRODIGI_API_KEY` and `PRODIGI_BASE_URL=https://api.prodigi.com/v4.0`. Optionally use the quotes endpoint for per-country shipping rates.
3. **Storefront hardening:** terms/returns/privacy pages, contact email, definition-text moderation, custom domain on Vercel.
4. **Ops (as volume grows):** move order records to a database, add a job queue between webhook and Prodigi, and set Prodigi's `callbackUrl` for pushed status updates.
