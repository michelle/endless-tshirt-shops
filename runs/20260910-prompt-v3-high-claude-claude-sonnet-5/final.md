## Done — "Constella" is live

**Live site:** https://benchmark-20260910-prompt-v3-high-c-pied.vercel.app
**Vercel project:** `benchmark-20260910-prompt-v3-high-claude-claude-sonnet-5`

### The concept
**Constella** — wear your own constellation. A customer types a name/phrase (e.g. "Grace & Leo") and an optional subtitle (a date, city, whatever). A deterministic generative-art engine hashes that text into a unique star field + connecting lines + typography, rendered live in the browser. Same input always reproduces the exact same artwork (so reorders are possible), but no two different phrases ever collide — that's the DTG hook: instead of picking from a catalog of stock designs, every shirt is generated fresh, once, for one person, at checkout time, then printed direct-to-garment.

### How it's built
- **Next.js app** (App Router) on Vercel, Tailwind styling.
- Generative engine (`src/lib/constellation.js`) is pure math (FNV hash → seeded PRNG → star layout), shared by the live canvas preview and the high-res export.
- **Stripe Checkout** for payment (redirect-based, card entry never touches our server). I provisioned this via `stripe sandbox create` since no keys were provided — it's a **test-mode sandbox**, not your real Stripe account.
- **Vercel Blob** stores the customer's rendered PNG (so Prodigi/Stripe can fetch it over https) and small JSON "order" records (no database in this build).
- **Fulfillment is strictly payment-gated**: `/api/checkout` creates a Stripe session and a *pending* order record but never talks to Prodigi. Only the `checkout.session.completed` **webhook**, after verifying Stripe's signature and `payment_status === "paid"`, calls Prodigi's order API — idempotently, keyed on the Stripe session id.
- Product is Prodigi's real sandbox SKU `GLOBAL-TEE-GIL-64000` (Gildan 64000 unisex tee), 8 shirt colors, XS–5XL.

I verified the **entire pipeline live**, end to end, with a scripted browser run against the deployed site: added a design → Stripe test checkout with card `4242 4242 4242 4242` → webhook fired → Prodigi sandbox order `ord_1171370` was created with the correct recipient/address and the correct artwork URL, which Prodigi had already downloaded (`"downloadAssets": "Complete"`).

### How you can test it
1. Visit the site above → **Design Yours** → type a name/phrase, pick a palette/shirt color/size → **Add to Cart** → **Checkout with Stripe**.
2. On the Stripe page (it'll show a yellow "unclaimed sandbox" banner — expected), use test card **4242 4242 4242 4242**, any future expiry/CVC, any US shipping address.
3. You'll land on `/success` showing the order and "Sent to our print partner" once the webhook completes (usually 1-2s).
4. ⚠️ **Claim the Stripe sandbox soon**: I generated it under your email and it **expires 2026-09-17** if unclaimed: https://dashboard.stripe.com/onboard_sandbox/YWNjdF8xVUU3TWZQcTZIaU11RDdYLDE3ODk2NzEwNjIv1008fRh3C9r

### Known gaps
- **Nothing here produces a real, shipped t-shirt or moves real money** — Stripe is in test mode and Prodigi is the sandbox API, by design (only sandbox creds were provided).
- No database — orders live as JSON files in Blob storage, addressed by random IDs. Fine for a demo, not for scale/reporting.
- No customer accounts or order-history page beyond the one-time `/success` view.
- No profanity/content filter on the customer's text.
- Shirt mockup is a stylized flat SVG icon, not a photorealistic garment render.
- US shipping only; no sales tax collected (Prodigi's own quote flags this).
- Print art is exported at 2100px wide — solid for DTG but under Prodigi's max (4665px); easy to bump later.
- Prodigi's status-callback endpoint is implemented but unauthenticated (their sandbox docs don't define a signing scheme).
- No automated test suite, rate limiting, or load testing.

### To go to production
1. **Claim the Stripe sandbox** (link above), then create/switch to Stripe **live** keys and update `STRIPE_SECRET_KEY`/`STRIPE_PUBLISHABLE_KEY`, and recreate the webhook endpoint against live mode.
2. Get a **production Prodigi account + live API key**, switch `PRODIGI_API_BASE` to `https://api.prodigi.com/v4.0`, and confirm live pricing (sandbox quoted ~$12.20 item + ~$4.74 shipping for a US order — retail pricing here, $30-35, assumed similar live costs; re-verify).
3. Turn on Stripe's "successful payment" receipt emails in the Dashboard (not on by default for a fresh account).
4. Add a real database for orders/reporting, a profanity filter on user text, and expand shipping countries.
5. Custom domain + basic legal pages (returns/privacy/terms).
