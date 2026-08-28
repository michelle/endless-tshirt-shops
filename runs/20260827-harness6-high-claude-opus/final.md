Done. Everything is deployed and verified end-to-end.

## 1. What I built

**https://benchmark-20260827-harness6-high-cl-chi.vercel.app** (Vercel project `benchmark-20260827-harness6-high-claude-opus`)

A rebuild of datetime.store on Next.js 15 / React 19 / TypeScript. One product: a black tee printed with the Unix millisecond timestamp of the instant you pressed buy. The number ticks on an SVG shirt silhouette at animation-frame rate (written straight to the DOM, not through React state), freezes the moment you commit, and that frozen number drives everything downstream.

I kept the original's visual lineage — the two shirt silhouette paths, the fitted/unisex and S/M/L/XL pickers, the `$30.00` struck through to `$22.50`, its two blues (`#337ab7` / `#a4d5ff`), and Chivo for the print — and rebuilt the layout, type, and states around them.

Purchase flow: click buy → freeze `ts` → Stripe **embedded** Checkout mounts in place (no redirect, so the one-page feel survives) → `onComplete` → receipt renders immediately → the Prodigi order is placed. Scalable Press is gone; fulfilment is Prodigi (Gildan 64000 unisex / 64000L women's, black, `fitPrintArea`).

The print asset is generated on demand at `/api/artwork?ts=…&print=1` — Satori + resvg render white Chivo Bold digits on a transparent 3925×748 canvas, sized from the digit count so the number lands ~9in wide inside the ~11.7in chest area at roughly 300dpi. Prodigi downloads it by URL, so there is no artwork upload and no blob storage.

## 2. How to run and verify

```bash
npm install && cp .env.example .env.local   # fill in 4 values
npm run dev
```

`GET /api/health` checks config **and** prices a live Prodigi quote, so it tells you if you're still selling above cost:

```json
{"ok":true,"stripe":{"testMode":true,"webhookConfigured":true},
 "prodigi":{"landedCost":"$16.99","price":"$22.50","grossMargin":"$5.51"}}
```

`scripts/smoke-purchase.mjs` drives the whole purchase (`npm i -D playwright`, then `BASE=… node scripts/smoke-purchase.mjs`). I ran it repeatedly against the live deployment. Verified there:

- Both SKUs and several sizes → Prodigi orders `ord_1169321`–`ord_1169325`, all `downloadAssets: Complete`, asset `status: Complete`, zero issues. **Prodigi really did fetch and accept the artwork**, which is the step that only works once deployed.
- Idempotency: webhook and client both fire; exactly **1** Prodigi order per session, confirmed by re-POSTing fulfilment and re-counting.
- Webhook rejects unsigned (400) and bad-signature (400) requests; `pending_webhooks=0` on every event.
- No console errors, no failed requests; mobile/tablet/desktop clean.

## 3. What you need to do before real customers

1. **Claim the Stripe sandbox — it expires 2026-09-04.** `https://dashboard.stripe.com/onboard_sandbox/YWNjdF8xVTlBa0xCNG9hcEhTNVg0LDE3ODg0OTE5NDMv100zeNUB3L3` (`acct_1U9AkLB4oapHS5X4`). The current key is a restricted `rkcs_test_…` with limited permissions.
2. **Swap to live keys**: `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, and a live Prodigi key (anything not prefixed `test_` routes to the live API automatically). Recreate the webhook against the live account and update `STRIPE_WEBHOOK_SECRET` — the existing endpoint is `we_1U9GZIB4oapHS5X4BrdQkfYK`.
3. **Order a sample.** Prodigi centres the design in the print area; the original sat 3in from the collar. Confirm placement and that white DTG ink on black reads the way you want before selling.
4. **Re-check the margin.** $5.51 gross, ~$4.55 after Stripe fees. Raise the price or drop to a cheaper blank if that's too thin.
5. **Decide on Link.** Its "save my info" box is pre-checked in Checkout and then makes a phone number mandatory. Turn it off under Settings → Payments → Link if you want the leanest checkout.
6. Point a real domain at it, set `NEXT_PUBLIC_SITE_URL`, and add terms/privacy pages.

## 4. Limitations and assumptions

- **No database.** Order state lives in Stripe metadata (session = what was bought, PaymentIntent = Prodigi order id + any error). Fine at this volume, but there's no admin view and no "show me every stuck order" beyond filtering PaymentIntents on `prodigi_error`.
- **US only**, free shipping. `SHIPPING_COUNTRIES` is a one-line change but international shipping cost isn't modelled.
- **No shipped-email.** Tracking only appears if the customer returns to their order page.
- Prodigi's status callback endpoint logs only — the callbacks are unsigned, so it never mutates order state.
- I assumed black is the only colour and $22.50 the price, both from the original.

## 5. Decisions and why

- **Embedded Checkout over rebuilding Elements + Payment Request API.** The original hand-rolled a card form and a wallet button. Embedded Checkout keeps the purchase on one page, but hands PCI scope, wallets, address collection, and 3DS to Stripe.
- **Server-rendered artwork instead of the canvas `toDataURL()` upload.** The original shipped a screen-resolution canvas to the printer. A URL derived from `ts` means the print is ~300dpi, reproducible forever, and the shirt physically cannot disagree with the receipt.
- **Fulfil from two places.** The webhook is authoritative; the order page also triggers it, so a shop with a misconfigured webhook still ships. Prodigi's `idempotencyKey` (the session id) makes the race safe.
- **Two-phase order page.** Prodigi's create call takes ~7s. Blocking on it left a customer who had just paid staring at a spinner, so `GET` reads fast and shows the receipt while `POST` places the order behind it.
- **Pinned the Stripe API version.** The account default has renamed `ui_mode: 'embedded'` to `'embedded_page'`; pinning `2025-08-27.basil` keeps requests in sync with the SDK's types.

## 6. Friction

- `stripe sandbox create` appeared to hang for 15 minutes — it was actually my own `sed` pipe block-buffering its output. Rerunning unbuffered returned in ~40s.
- The sandbox key is a restricted `rkcs_test_…`; `/v1/balance` is denied. I checked each endpoint I needed individually rather than assuming.
- First deploy was rejected: Next.js 15.5.4 is flagged vulnerable. Upgraded to 15.5.24.
- Vercel enabled Deployment Protection on the new project, which would have blocked Prodigi from fetching artwork. Disabled it via the API.
- My first print asset clipped digits at both edges. Caught it by measuring the alpha bounding box rather than eyeballing white-on-transparent, then sized the canvas from the digit count.
- `/opengraph-image` 500'd in production only: Vercel's file tracer can't see a font read through `path.join(process.cwd(), …)`. Fixed with `outputFileTracingIncludes` — and pinned `/api/artwork` the same way, since that failure mode would have shipped blank shirts.
- Two smoke-test runs failed at the pay step and both were test-harness artifacts, not app bugs: Link's pre-checked box making phone required, then the Link auth modal intercepting clicks once the test email had been enrolled. Fixed by filling the phone and using a fresh email per run.
