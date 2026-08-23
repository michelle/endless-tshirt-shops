Confirmed the project name matches exactly. Here's the completion report.

## 1. What I built and the deployed URL

A production-quality rebuild of **datetime.store** — a shirt printed with the exact date and time (down to the millisecond) at the moment a customer completes checkout.

**Live URL:** https://benchmark-20260823-hardened-high-cl.vercel.app
**Vercel project:** `benchmark-20260823-hardened-high-claude-sonnet` (new project, not linked to any existing one)

Stack: Next.js 16 (App Router) + React 19 + TypeScript + Tailwind v4, deployed on Vercel. The homepage shows a live-ticking preview of the shirt design (dark card, weekday, big date/time in Chivo/Chivo Mono, accent color by style) that freezes the instant checkout is submitted. Style (Fitted/Unisex) and size (S/M/L/XL) selectors drive both the preview and the order. Checkout collects shipping info, creates a Stripe PaymentIntent, and renders Stripe's PaymentElement. On success, a webhook renders the exact same design server-side to a PNG (via `resvg` + embedded Chivo TTFs, guaranteeing the shirt matches the preview pixel-for-pixel), uploads it to Scalable Press, gets a quote, and places a real (test-mode) print order — with status visible on an order confirmation page that polls until fulfilled.

## 2. How to run and verify it

- Visit the URL above, pick a style/size, click "Buy this exact moment," fill in shipping, and pay with Stripe's test card `4242 4242 4242 4242` (any future expiry/CVC/ZIP).
- I already ran this exact flow three times against the live deployment (both styles, several sizes) via the Stripe API directly — each time the PaymentIntent succeeded, the webhook fired, and Scalable Press returned a real test-mode order ID. You can hit `GET /api/order-status?payment_intent=<id>` on any of these to see `fulfillmentStatus: "ordered"`.
- Locally: `npm install`, add a `.env.local` with `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `SP_AUTH`, `STRIPE_WEBHOOK_SECRET`, run `stripe listen --forward-to localhost:3000/api/webhook` in one terminal and `npm run dev` in another.

## 3. Actionable steps to get this ready for real customers

1. **Switch to live keys.** Set `STRIPE_SECRET_KEY`/`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` to live Stripe keys and a live `SP_AUTH` key in Vercel's project settings; register a new webhook endpoint (`/api/webhook`) in live mode and set `STRIPE_WEBHOOK_SECRET` accordingly.
2. **Verify garment/print combos with Scalable Press before launch.** I found the "Fitted" style's original product mapping (`gildan-ultra-ladies-t-shirt`) reliably 500s on their `/quote` endpoint in test mode — I remapped it to `next-level-fitted-crew`, which works, but you should confirm pricing/quality/available colors with Scalable Press directly for both SKUs before going live, and consider revisiting the "Unisex" mapping too (it prints fine but comes back with a "may not print well with dtg" warning for white + `gildan-ultra-cotton-t-shirt`).
3. **Add tax/shipping transparency.** The current price ($22.50) is fixed regardless of actual Scalable Press quote total (which includes their fees/shipping/tax, e.g. $13–15 in test mode). Decide on a margin/pricing model and reconcile it against real quotes.
4. **Handle webhook failures operationally.** On a Scalable Press error, the PaymentIntent metadata is set to `fulfillment_status: "error"` with the error message, but nothing pages anyone. Wire this to an alert (email/Slack) so a human can manually reprocess or refund.
5. **Add a receipt/confirmation email.** Currently the only confirmation is the `/order` page; there's no transactional email after purchase.
6. **Custom favicon/OG image and legal pages** (returns policy, terms) — currently using the default Next.js favicon and no metadata/OG image.
7. **Idempotency/retry hardening** for the webhook beyond the current "skip if already ordered" check — fine for now, but consider Stripe's idempotency keys if fulfillment logic grows.

## 4. Known limitations / assumptions

- Test/sandbox-only: uses a Stripe test-mode sandbox and Scalable Press's test key throughout — no real charges or real prints occur.
- All times shown/printed are in UTC (no timezone localization), and "the moment" is frozen at PaymentIntent creation (i.e., when shipping details are submitted), not at final payment confirmation — a few seconds' difference in practice.
- Order status polling times out after ~40 seconds; if Scalable Press is slow, the customer sees "sending to print…" indefinitely without a hard failure state.
- No customer accounts, order history, or admin dashboard — order state lives entirely in Stripe PaymentIntent metadata.
- Garment color is hardcoded to White; only one print type (DTG) is used.

## 5. Summary of decisions and why

- **Product mapping via `product.ts`** as a single source of truth for pricing/style/size/Scalable Press SKUs, imported by both API routes and UI — avoids drift between what's charged and what's ordered.
- **Shared `design.ts` (isomorphic SVG builder)** used by both the live client-side preview and the server-side PNG renderer, so what the customer sees is exactly what gets printed — no separate "preview" vs "print" design logic to keep in sync.
- **Split `artwork.ts` (server-only, `resvg` + embedded fonts) from `design.ts`** to keep Node-only dependencies out of the client bundle; enforced with the `server-only` package.
- **Metadata-as-datastore on the Stripe PaymentIntent** instead of a database — appropriate for a lean rebuild; fulfillment status, Scalable Press order ID, and errors all live on the PaymentIntent, queryable via `/api/order-status`.
- **`redirect: 'if_required'` + native `shipping` field** on the PaymentIntent — simplest correct integration for card-first checkout while still supporting redirect-based methods if enabled later.

## 6. Friction encountered

- **Next.js 16 + Turbopack required `serverExternalPackages: ["@resvg/resvg-js"]`** — without it, the build failed trying to bundle resvg's native binding into an ESM chunk.
- **Font files needed explicit `outputFileTracingIncludes`** or Vercel's serverless bundle wouldn't include the embedded Chivo TTFs used for print-artwork rendering.
- **Scalable Press auth convention** was undocumented in a way I could find quickly — Basic auth needs the key as the *password* with an *empty username*, not the reverse; discovered via a live 401.
- **A genuine Scalable Press catalog bug**: the natural "ladies fitted tee" SKU (`gildan-ultra-ladies-t-shirt`) 500s on every quote request regardless of size/color, as does a second ladies SKU I tried — I worked around it by using `next-level-fitted-crew` (a unisex-fitted cut) instead, which quotes and orders successfully.
- Recovering the original product's copy/UX intent required mining a Wayback Machine snapshot's compiled JS/CSS bundles directly (WebFetch couldn't reach web.archive.org), since the GitHub repo itself had little else to go on.
