Everything checks out independently — the store is live, payment works, and paid orders flow into Prodigi. Here's the full picture.

## What was built

**MANTRA — "Wear Your Word"**: a one-product store selling **The One-of-One Tee** ($29 + $4.99 shipping). The customer types a word (up to 14 chars), picks one of 4 typographic design styles (Monolith, Echo, Heritage, Arc), an ink color, a shirt color, and a size. This leans fully into DTG: **every shirt's artwork is generated uniquely server-side** — the design is composed as SVG from the customer's text, converted to vector paths with bundled OFL fonts (Anton, Archivo Black, Libre Baskerville), and rasterized to a print-ready 4677×5787 px / 300 DPI PNG via sharp.

**Live at: https://benchmark-20260928-rep2-high-kimi-kimi-code-k3.vercel.app**

Pipeline: Next.js storefront → Stripe Checkout (payment) → Stripe webhook `checkout.session.completed` (signature-verified) → **only then** order submitted to Prodigi (`GLOBAL-TEE-BC-3001`, Bella+Canvas 3001) with a signed, deterministic print-image URL → Prodigi status callbacks update the order → `/success` page shows a live status timeline. Low-contrast ink/shirt combos and invalid input are rejected server-side; Stripe idempotency keys prevent duplicate print orders on webhook retries.

## How to test it

1. Go to the URL above, design a shirt (try style "Arc", ink "Chalk", shirt "Black").
2. Click buy — you'll land on real Stripe Checkout. It's **test mode**: card `4242 4242 4242 4242`, any future expiry, any CVC/ZIP, your real email.
3. Pay → redirected to the success page → watch the status timeline flip from "Payment received" → "Sent to printer" → Prodigi stage (InProgress → Complete).
4. Verify the print order: sandbox dashboard at `sandbox-beta-dashboard.pwinty.com`, or `GET https://api.sandbox.prodigi.com/v4.0/orders/<id>` with your API key. A real paid order already exists from testing: `ord_1175109` (status InProgress, correct SKU/color/size, asset URL serving the generated PNG).

I verified all of this live just now, including a genuine browser-driven payment with the 4242 card during the build.

## Known gaps

- **Stripe sandbox is temporary** — it expires **2026-10-05**. Claim it to keep it: `https://dashboard.stripe.com/onboard_sandbox/YWNjdF8xVUtsWXBFWXpHTnJHSkwwLDE3OTEyMzg3MTQv100LLdqDoZp`
- **No database** — order state lives in Stripe session metadata. Fine at this scale; a real store wants a proper orders DB (e.g. Postgres/Vercel KV) for history, admin, and support.
- **No transactional emails** — Stripe sends a receipt, but there's no shipping/confirmation email from the store itself.
- **No abuse controls** — no rate limiting, no profanity filter on custom text (someone can print a rude word), no fraud screening.
- **Single shipping speed** ("Budget"), no taxes collected (Stripe Tax not enabled), no promo codes.
- **Prodigi webhooks are unauthenticated** (Prodigi doesn't sign callbacks); impact is low (worst case: wrong status string shown).
- Preview is approximate — client preview uses webfonts; final print uses vector paths of the same fonts, so layout is near-identical but not pixel-equal.

## To go to production

1. **Stripe**: claim the sandbox above, or use your own account — swap in **live** keys, create a new live webhook endpoint for `/api/webhooks/stripe`, update `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` on Vercel. Enable Stripe Tax if you need sales-tax/VAT collection.
2. **Prodigi**: generate a **live** API key at `dashboard.prodigi.com` and set `PRODIGI_API_KEY` + `PRODIGI_BASE_URL=https://api.prodigi.com`. Order one physical sample first (50% off first sample) to check print quality of each design style.
3. **Domain**: attach a real domain in the Vercel project; update the Stripe webhook URL accordingly.
4. Add a database + order admin view, order-confirmation emails (Resend/Postmark), rate limiting, and a text moderation filter.
5. Legal/page basics: returns policy (custom goods are usually final-sale), privacy policy, terms.

Code lives in `store/` in the workspace; e2e test scripts are in `store/scripts/` if you want to re-run the payment/webhook verification yourself.
