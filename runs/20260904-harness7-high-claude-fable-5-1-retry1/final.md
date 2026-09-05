## 1. What I built and where it runs

**Live URL:** https://benchmark-20260904-harness7-high-cl-one.vercel.app (Vercel project `benchmark-20260904-harness7-high-claude-fable-5-1-retry1`, production deployment, no protection).

A Next.js 16 rebuild of datetime.store: one black tee printed with the Unix time in milliseconds at the instant you click **Buy now**. The page keeps the original's shape: the ticking shirt on the left with the `$30.00 → $22.50` badge, Fitted/Unisex and size toggles on the right, an express wallet button first with "Or enter details manually" beneath, and the "Congrats on your pretty cool shirt!" success state.

- **Stripe.** Payment Element plus Express Checkout Element (Link, Klarna, Amazon Pay now; Apple Pay and Google Pay once the domain is registered) with a deferred PaymentIntent. Price is set server-side. The PaymentIntent is the order record: design, shipping, and later the Prodigi order id live in its metadata. No database.
- **Prodigi.** Fitted → `GLOBAL-TEE-BC-6004` (Bella+Canvas 6004, the original's first-choice product), Unisex → `GLOBAL-TEE-BC-3001`, both black. Orders are created idempotently from a `payment_intent.succeeded` webhook and from a client fast path, using the PaymentIntent id as Prodigi's `idempotencyKey`. A callback route mirrors print status back into Stripe.
- **Print file.** `/api/artwork/{style}-{timestamp}.png` renders a transparent 4680×5790 PNG (full front print area, 300 dpi) with the epoch value and UTC line in Chivo, in about one second. The on-screen shirt uses the same layout constants, so what you see is what prints. Prodigi downloads this URL directly, which is why no file storage is needed.
- **Order page** at `/orders/{paymentIntentId}` shows payment status, the print status from Prodigi, and a link to the exact print file.

## 2. How to run and verify

```bash
cp .env.example .env.local   # keys listed in README
npm install && npm run dev
BASE_URL=https://benchmark-20260904-harness7-high-cl-one.vercel.app PRODIGI_API_KEY=… node scripts/verify-flow.mjs
```

The script drives headless Chromium through a real purchase with card `4242 4242 4242 4242` and asserts the timestamp freezes at click time, Stripe reports `succeeded`, a Prodigi order exists with the right SKU/size/address/asset URL, and the print file is a PNG. Screenshots land in `verify-artifacts/`.

What I verified against production:

| Check | Result |
| --- | --- |
| Browser purchase, Unisex L | PaymentIntent succeeded, Prodigi order ord_1170433 |
| Prodigi asset download | `downloadAssets: Complete` on that order |
| Webhook-only fulfillment (no client call) | ord_1170434 created by the webhook |
| Health, page, icon, artwork, OG image | all 200 |

## 3. Steps you need to take before real customers

1. Claim the Stripe sandbox before **2026-09-12** via `stripe sandbox claim`, or point the app at your own account. Then swap in live keys, create a live webhook endpoint for `payment_intent.succeeded`, and update `STRIPE_WEBHOOK_SECRET`.
2. Register the domain for Apple Pay (`stripe payment_method_domains create`). The claimable-sandbox key lacks permission for this.
3. Switch `PRODIGI_ENV=live` with a live Prodigi key, add a payment method on Prodigi, and place one real order to eyeball print placement and size (currently about 10.4 inches wide, 2.7 inches below the top of the print area).
4. Decide pricing and tax. Sandbox unit cost is roughly $12 to $14 plus $4.73 US Standard shipping against a $22.50 price. Stripe Tax is not enabled.
5. Add a custom domain and set `PUBLIC_BASE_URL` if you'd rather Prodigi not fetch artwork from a `vercel.app` host.
6. Review the Klarna/Amazon Pay/Link buttons that Express Checkout surfaces; disable any you don't want in the Stripe dashboard.

## 4. Known limitations and assumptions

- Ships to the US only (`SHIP_COUNTRIES`), matching the original. Prodigi can ship these SKUs worldwide, but the flat price assumes domestic shipping.
- Shipping is attached by Stripe.js at confirmation, with a server-validated copy in metadata as fallback. Fulfillment double-checks the country.
- Order pages are addressable by PaymentIntent id, which is unguessable but not authenticated, the same trust model as a Stripe Checkout success URL.
- No admin UI, no refunds or cancellation flow, no emails beyond Stripe's receipt. Prodigi callbacks update status but nothing notifies the customer of shipping.
- Prodigi's sandbox never actually prints, so production placement is unverified until step 3 above.

## 5. Decisions and why

- **Stripe as the only datastore.** A one-product shop with deterministic artwork doesn't need a database. Idempotency comes from Prodigi's `idempotencyKey` plus a metadata guard.
- **Server-rendered print file instead of uploading the canvas.** The original posted a canvas PNG. Generating from the timestamp removes storage, makes the file reproducible, and gives Prodigi a stable URL.
- **Express Checkout and the manual form are mutually exclusive**, as in the original. This is also required technically because `elements.submit()` validates every mounted Element.
- **Deferred PaymentIntent with in-page Elements** rather than hosted Checkout, to keep the original's single-page feel and the freeze-on-click behaviour.
- **Bella+Canvas SKUs** because they are what the original author chose, and both come in black with the full size run.

## 6. Friction

- **Stripe Projects could not be used.** `stripe projects init` requires a browser-authenticated live login and there was no session, so I used `stripe sandbox create` instead.
- **Vercel CLI created the project with no framework preset**, so the first two deployments built fine but served only `public/` and 404'd everything else. Fixed by PATCHing `framework: nextjs` through the REST API. The long project name also produced a truncated production alias, and the team default SSO protection blocked the alias until I disabled it.
- **Stripe rejected server-set shipping** when the Address Element tried to re-attach it, and **Prodigi rejected empty optional strings** like `phoneNumber: ""`. Both fixed.
- The `vercel api --data` flag rejected JSON bodies, so I used curl with the CLI's stored token.
