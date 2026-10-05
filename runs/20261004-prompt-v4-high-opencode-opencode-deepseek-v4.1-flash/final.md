I've built, deployed, and verified the store end to end. Here's the summary.

## What I built

**Aster** — a made-to-order store that prints the exact night sky over a chosen moment onto a shirt. The customer enters a title, an optional subtitle, a date, a local time, and a place. The app geocodes the place, resolves the time zone, projects a catalogue of ~2,900 naked-eye stars, the classical constellation lines, and the moon phase for that instant using local sidereal time, and renders an editorial chart (title, coordinates, date/time, moon phase, cardinal points).

Because it's DTG, every order is a genuine one-of-one, and the same SVG that powers the live preview is rasterised to a 4,000×4,000 transparent PNG for print — so what the customer sees is exactly what is printed.

**Stack:** Next.js 15 (App Router) on Vercel · Stripe Checkout (payment) · Prodigi Print API v4 (fulfilment) · `@resvg/resvg-wasm` for rasterisation (no native modules) · HYG star catalogue + d3-celestial constellation lines. No database — fulfilment state lives on the Stripe Checkout Session and PaymentIntent.

## Live URL

**https://temporary-spry-orion-vl69qeo.vercel.app**

This is a Vercel *anonymous* deployment, so it expires about 60 minutes after it was created. To keep it, open the claim link: `https://vercel.com/claim-deployment?code=8489e3e8-e7f2-49b8-97f1-1a8b6d97f1fb`.

## How to test it

1. Open the URL. The builder loads with a sample chart and a live preview that updates as you type.
2. Change the title, date/time, and search a place (e.g. "Kyoto"); pick a palette, shirt colour and size. "Open print file" shows the actual 4,000×4,000 PNG.
3. Click **Buy this shirt**.
4. Pay with the Stripe test card **`4242 4242 4242 4242`**, any future expiry, any CVC. (If Stripe Link prompts, use a fresh email or enter `000000`.)
5. The confirmation page shows **Paid** and a Prodigi order id. In the Prodigi sandbox the order moves to `InProgress` and downloads the artwork.

## What I verified (not just claimed)

- Payment succeeds and Prodigi is **only** called after `payment_status === "paid"`.
- A real Prodigi sandbox order was created per paid session, with SKU `GLOBAL-TEE-GIL-64000`, `fitPrintArea`, correct colour/size, and the customer's address.
- Prodigi **downloaded the artwork** (`downloadAssets: Complete`) and its MD5 matched my generated PNG exactly.
- The webhook acknowledges Stripe immediately (`pending_webhooks: 0`) and fulfils after the response via `after()`; the confirmation page is an idempotent fallback.
- The order is idempotent on the Checkout Session id, so webhook retries never double-order.

## Known gaps

- **The deployment is temporary (60 min, claimable).** That's the main gap; the code is production-ready but the host is not permanent.
- **Sandbox only** — Stripe test mode and the Prodigi sandbox, so nothing is charged and nothing ships.
- No database, no tax calculation, single flat shipping rate, no order-history UI, and no email beyond Stripe's receipt.
- Geocoding uses the free Open-Meteo endpoint (no key, fair use).
- Fulfilment runs in a serverless function; on a busy store it should move to a queue so a slow Prodigi call can never be cut off.

## To take it to production

1. **Hosting:** deploy to a real Vercel account (or any Node host) for a permanent URL; set `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `PRODIGI_API_KEY` as environment variables.
2. **Payments:** replace the test sandbox with a live Stripe account, add the Terms of Service URL in the dashboard (the test sandbox couldn't collect consent), and register the live webhook.
3. **Fulfilment:** switch `PRODIGI_API_URL` to the live API and use a live key; move fulfilment behind a durable queue with a small orders table for idempotency and audit.
4. **Commerce:** add tax, real shipping rates, returns/reprint policy, and legal pages.
5. **Quality:** order a physical sample to confirm the chart's print size and placement before launch.

The full source, `README.md`, and `.env.example` are in the workspace. The most important file to look at is `src/lib/design.ts` (the chart generator) alongside `src/lib/astronomy.ts` (the star projection).
