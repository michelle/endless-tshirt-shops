Working tree is clean, deployment is live and verified. Here's the summary.

## 1. What I built and where it's live

**https://benchmark-20260825-harness6-high-cl.vercel.app** (Vercel project `benchmark-20260825-harness6-high-claude-sonnet`)

A rebuild of datetime.store's core hook — *"we sell a t-shirt with the current datetime"* — on Next.js 16 + Tailwind:
- A live, millisecond-ticking timestamp rendered over a shirt silhouette (I reused the original's two SVG cuts — fitted/unisex), style + size (S–XL) picker, $30→$22.50 pricing, FAQ and "how it works" sections.
- **Stripe Checkout** (hosted session) for payment — card, Apple Pay, Google Pay, Link, Klarna, Amazon Pay all show automatically — with free worldwide shipping and address collection.
- A Stripe webhook creates a **Prodigi** print order on `checkout.session.completed`, replacing the original's Scalable Press integration. Print artwork (the frozen date/time) is generated on-demand as a PNG via a stateless `next/og` endpoint, so no database is needed to reproduce it later.

## 2. How to run and verify it

- Visit the URL above, pick a style/size, click "Buy now," pay with Stripe test card `4242 4242 4242 4242` / any future expiry / any CVC, any address. You'll land on `/success` with the order summary.
- I verified this exact flow twice with Playwright driving a real browser against the live deployment — full purchase → webhook fired → real Prodigi sandbox order created (`ord_1168835`), and Prodigi's own API confirms `downloadAssets: Complete` on our artwork URL, i.e. Prodigi actually fetched the print file from the deployed app.
- Locally: `npm install`, copy `.env.example` → `.env.local`, `npm run dev`. Full instructions, including the Playwright smoke test, are in `README.md`.

## 3. Steps for a human to take it live

- **Claim the Stripe sandbox** — I provisioned one via `stripe sandbox create`; it's unclaimed and expires 2026‑09‑01. Claim it (URL is in my session) or swap in your own Stripe account, then switch all keys to live mode and re-point the webhook.
- **Claim/upgrade Prodigi** — currently using the sandbox key you provided; get a production Prodigi API key and set `PRODIGI_ENVIRONMENT=live`.
- **Register a live Stripe webhook** pointed at `/api/webhooks/stripe` for `checkout.session.completed` and set its secret as `STRIPE_WEBHOOK_SECRET`.
- **Custom domain** — point `datetime.store` (or whatever domain) at the Vercel project.
- **Apple Pay domain verification** — needs a real domain + Stripe dashboard step (the original had a `.well-known/apple-developer-merchantid-domain-association` file; Checkout's built-in Apple Pay doesn't need this, but a custom Payment Request button would).
- Decide on tax handling (none currently — Stripe Tax could be enabled) and a real shipping-cost/carrier strategy beyond flat "free."

## 4. Known limitations / assumptions

- No database — order state lives entirely in Stripe (session/PaymentIntent metadata) and Prodigi. Fine at this scale; a real support tool would want an orders table.
- Success page reads the Checkout Session directly rather than waiting on the webhook, so it can show a confirmation before Prodigi fulfillment completes (by design, to avoid a race/blocking UX).
- Shipping is a flat "Standard" Prodigi method for all destinations at $0 — no real-time rate shopping.
- I used Stripe's hosted Checkout instead of the original's custom Stripe Elements + PaymentRequest button — simpler, more secure (no raw card handling in our code), and it gets Apple/Google Pay for free.

## 5. Key decisions and why

- **Two real Prodigi SKUs** matched to the original's "fitted"/"unisex" concept: `GLOBAL-TEE-BC-6004` (women's fitted) and `GLOBAL-TEE-GIL-64000` (unisex), both size-limited to S–XL to match the original.
- **Stateless artwork generation** (`/api/artwork` encoding date/time/tz in the URL) instead of persisting a canvas snapshot — avoids a database while still reproducing the exact purchased moment for print.
- **Idempotent Prodigi orders** using the Stripe session id as both `merchantReference` and `idempotencyKey` — confirmed working when Stripe redelivered a webhook and Prodigi correctly returned `AlreadyExists` instead of double-printing.

## 6. Friction

- The original repo had no real README/product description — I reconstructed the actual product (live-ticking timestamp tee, Scalable Press/DTG fulfillment, Stripe charges API, Apple Pay) by reading its actual source files (`Shirt.js`, `Checkout.js`, `server/index.js`) via GitHub's raw API rather than trusting a generic repo summary.
- Playwright's Stripe Checkout automation needed a few iterations (payment-method accordion selectors, an ambiguous "Pay" button match) before it reliably drove a real test purchase.
- Had to fix a client/server hydration mismatch from the ticking clock's initial render (`Date.now()` differs between SSR and client) by deferring the first tick to `useEffect`.
