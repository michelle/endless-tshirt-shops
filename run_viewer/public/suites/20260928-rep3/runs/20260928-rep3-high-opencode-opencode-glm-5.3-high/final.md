Everything is built, deployed, and verified. Here's the full picture:

## 4000 Fridays — your whole life, one dot per week

**Live at: https://benchmark-20260928-rep3-high-openco.vercel.app**
(Source in `$BENCHMARK_WORKSPACE`, Vercel project `benchmark-20260928-rep3-high-opencode-opencode-glm-5.3-high`)

**The concept.** You get about 4,000 Fridays in a life — so every shirt is a *life calendar*: one dot for every week you've been alive, the week you're living now ringed in your accent colour, and your remaining weeks (to age 80) as faint dots. Each print is generated to order from the customer's **name + birth date + caption + colours** — pure deterministic math, which is exactly what DTG is for (4,160 dots per shirt; screen printing this is impossible). No two customers get the same print. Same shirt blank for everyone: Bella+Canvas 3001 (`GLOBAL-TEE-BC-3001`, verified against the Prodigi sandbox product endpoint).

**The stack.** Next.js 14 (App Router, TypeScript, no database) + Stripe Checkout + Prodigi Print API v4. The exact SVG the customer previews (pure functions, `lib/design.ts`) is rasterised server-side to 4680×5790px @300 DPI (the SKU's front print area) with `@resvg/resvg-js` + bundled OFL fonts — so **preview == print**, and the timeline is frozen at purchase time so the print file never changes.

**The payment rule (only after payment succeeds).** Fulfilment has two idempotent triggers — the `/success` page (retrieves the session from the Stripe API, checks `payment_status === "paid"`) and a registered `checkout.session.completed` webhook. Both feed the same code path; the Prodigi order uses `idempotencyKey = stripe-<session id>`, so races/double-delivery/refreshes produce exactly one order. Prodigi downloads the print file from an HMAC-signed URL (`/api/print-file`) that regenerates byte-identically (md5 verified in the order, and confirmed by Prodigi's `downloadAssets: Complete`).

## How you can test it

1. Open the URL, fill name + birth date (pick shirt colour, accent, size), watch the live preview.
2. Click **Buy** → Stripe Checkout (test mode) → pay with card `4242 4242 4242 4242`, any future expiry, any CVC, any email, a US (or other) address.
3. You should land on **PAID · SENT TO PRINT** with a Prodigi order id (e.g. `ord_…`), the frozen preview, and totals. I verified this full path with a real browser: order `ord_1175136` shows `downloadAssets: Complete` in the Prodigi sandbox.
4. Negative paths, also verified: card `4000 0000 0000 0002` (declined) → no order is ever created; `/success` on an unpaid session refuses to fulfil; unsigned `/api/print-file` requests get 404; refreshing the success page doesn't duplicate the order.
5. You can confirm orders yourself: `curl -H "X-API-Key: $PRODIGI_API_KEY" "https://api.sandbox.prodigi.com/v4.0/orders?top=5"`.

## Known gaps

- **Sandbox credentials only**: Stripe test-mode keys (the sandbox expires 2026-10-06 unless claimed) and the Prodigi sandbox — no real money moves and nothing ships.
- **No order database**: state lives in Stripe + Prodigi. No customer-facing order-history page, no fulfilment emails beyond Stripe's receipt, no Prodigi `callbackUrl` for shipping notifications.
- **Flat pricing**: $32 + $6.99 worldwide; no regional shipping rates, no taxes (Prodigi warned US sales tax applies; Stripe Tax not enabled).
- **Print-file URLs depend on the deployment**: `SITE_BASE_URL` + `APP_SECRET` must stay stable, or old signed URLs break (Prodigi retains downloaded art 30 days).
- **Fulfilment failure UX**: if Prodigi is down post-payment, the customer sees a "needs attention" screen and support must re-trigger (a retry queue would fix this).
- Design edge cases handled but worth review: age >80 (all dots filled, no "now" ring), long names auto-shrink.

## To bring it to production

1. **Payments**: claim the sandbox account / attach a real one, swap `STRIPE_SECRET_KEY` to a live restricted key, and register the live-mode webhook against your production domain; enable Stripe Tax (or at least tax-inclusive pricing for EU).
2. **Fulfilment**: replace `PRODIGI_API_KEY` with your live Prodigi key and set `PRODIGI_API_BASE=https://api.prodigi.com/v4.0`; review billing settings and consider Prodigi Pro for margin.
3. **Domain**: attach e.g. 4000fridays.com, update `SITE_BASE_URL`, keep `APP_SECRET` stable.
4. **Ops**: add an order store (Upstash/Turso), transactional emails, Prodigi callbacks → order-status page, and legal pages (privacy, terms, returns policy — custom garments are non-returnable, say so).
5. **Product**: consider a Prodigi pause window while you sanity-check the first live orders, and a size-guide page.
