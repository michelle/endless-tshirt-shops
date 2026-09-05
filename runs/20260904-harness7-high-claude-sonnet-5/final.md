## Summary

### 1. What I built and the deployed URL

A production-quality rebuild of **datetime.store** — a t-shirt printed with the exact millisecond you buy it — as a Next.js 16 (App Router, TypeScript, Tailwind) app with Stripe Checkout for payment and the Prodigi Print API for fulfillment (replacing the original's Scalable Press integration).

**Live URL: https://benchmark-20260904-harness7-high-cl-fawn.vercel.app**

- Live, animated millisecond clock rendered on a shirt mockup; pick style (Fitted / Unisex) and size (S/M/L/XL)
- Clicking Buy freezes that exact timestamp and sends the customer to Stripe Checkout ($22.50, struck through from $30, matching the original)
- The print artwork is generated on the fly (`/api/artwork`, via `next/og`) from that timestamp — the same image used as the Checkout line-item preview *and* the file handed to Prodigi, so what the customer saw is exactly what's printed
- On payment, a Stripe webhook places a real order against the **Prodigi sandbox** and the success page shows the resulting order ID

### 2. How to run and verify it

Locally:
```bash
npm install
cp .env.example .env.local   # fill in STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, PRODIGI_API_KEY
npm run dev
stripe listen --forward-to localhost:3000/api/webhooks/stripe   # in another terminal
```
Buy with test card `4242 4242 4242 4242`, any future expiry/CVC, any US address.

I verified the **deployed production app** end-to-end with a headless browser (Playwright): loaded the site, configured a shirt, completed a real Stripe test-mode payment on the hosted Checkout page, confirmed Stripe delivered the webhook to the live `/api/webhooks/stripe` endpoint, and confirmed a real Prodigi sandbox order (`ord_1170399`) was created with the correct SKU, size, color, shipping address, and a successfully-downloaded artwork asset. Full details are in the repo's README.

### 3. Steps to get this ready for real customers

1. **Claim the Stripe sandbox** I provisioned (expires 2026-09-12): https://dashboard.stripe.com/onboard_sandbox/YWNjdF8xVUMzUDVEMVlsRk0ydVI2LDE3ODkxNzk4NTYv100Nc492dPg — otherwise it and its test keys stop working in 7 days.
2. Switch to **live** Stripe keys and complete Stripe's account/business verification.
3. Switch to a **live Prodigi API key** and `PRODIGI_API_BASE=https://api.prodigi.com/v4.0`, and set up Prodigi billing (sandbox orders are free and never ship).
4. Create a **live-mode Stripe webhook** pointed at `/api/webhooks/stripe` and set that `STRIPE_WEBHOOK_SECRET` in Vercel.
5. Point a real domain at the Vercel project.
6. Add persistent storage (e.g., Postgres) keyed by Checkout Session ID for order history/admin — see limitations below.

### 4. Known limitations / assumptions

- No database — order state lives in Stripe + Prodigi only; webhook idempotency is a metadata check, not a real ledger.
- Flat "Standard" shipping to a fixed set of countries; no live rate shopping.
- One color (black) per style, matching the original.
- No customer accounts/order history beyond the Stripe receipt.
- Everything is in test/sandbox mode — no real charges, no real shirts printed.

### 5. Key decisions

- **Stripe Checkout** (hosted) over reimplementing raw Elements/Payment Request Button: less code, automatic Apple/Google Pay, PCI scope stays off our server, and it closely mirrors the original's payment options.
- **On-demand artwork via `next/og`** instead of the original's client-canvas-capture-and-upload: no image storage needed, and it guarantees the artwork Prodigi prints is pixel-identical to what generated the Checkout preview.
- **SKU mapping**: `GLOBAL-TEE-BC-6004` (Bella+Canvas Women's Favourite) for "Fitted" — actually matches a commented-out SKU in the original's server code — and `GLOBAL-TEE-GIL-64000` (Gildan Softstyle) for "Unisex".
- **No database**: for a demo/starting point, Stripe + Prodigi are the system of record; adding Postgres was flagged as a pre-launch step rather than built speculatively.

### 6. Friction

- The original repo's GitHub `main` branch had no source; had to discover it used `master` and pull the actual `src/`/`server/` files via the GitHub API to understand the real product (live ms-timestamp shirt, Stripe + Scalable Press).
- Stripe Checkout's hosted page changed shape since my training data (address autocomplete-by-default, `collected_information.shipping_details` replacing the old `shipping_details` field, Link-driven phone-number requirement) — worked through it with a real headless-browser run rather than guessing.
- A fresh project created via `vercel project add` defaults to framework "Other" (expects an `Output Directory: public`), which failed the first deploy; fixed with `vercel project update --framework nextjs`.
