# datetime.store

A rebuild of [Michelle's original datetime.store](https://github.com/michelle/datetime.store). The live Unix millisecond timestamp freezes when the customer captures a tee, then becomes the immutable print content throughout checkout and fulfillment. The Scalable Press flow has been replaced with the Prodigi Print API.

## Deployed store

https://benchmark-20260905-beauty-high-codex-gpt-6-astra.vercel.app

Vercel project: `benchmark-20260905-beauty-high-codex-gpt-6-astra`.

This is a publicly accessible **test-mode** deployment. Stripe test payments and Prodigi sandbox orders do not charge money or ship products. The claimable Stripe sandbox expires **September 12, 2026** unless claimed. Its credentials are in the run-specific Stripe CLI profile indicated by `BENCHMARK_STRIPE_CONFIG`. The claim URL is available in the private handoff, not committed to source.

## Try it

1. Pick a color, fit, and size. Open the size guide, switch to the print detail view, or pause/resume the live timestamp.
2. Click **Make this moment mine**. Verify that the bag preserves the exact timestamp.
3. Continue to Stripe Checkout. Use `4242 4242 4242 4242`, any future expiration, any three-digit CVC, and a fictional complete US shipping address. For example, `Datetime Test`, `123 Test Street`, `San Francisco`, `CA`, `94107`, `datetime-test@example.com`.
4. After payment, the receipt displays the frozen timestamp and the Prodigi order ID. Keep the private receipt URL. No address, email, name, or card details are exposed by the order-status endpoint.
5. A failed-card test can use `4000 0000 0000 0002`. Checkout cancellation returns to the store and preserves the bag. A capture older than 30 minutes must be refreshed before starting a checkout.

## Verified in this run

- Production Next.js build and TypeScript checks pass.
- Seven commerce tests cover price tampering, invalid variants, stale/future timestamps, asset signature tampering, paid/complete/amount/currency validation, environment isolation, deterministic fulfillment keys, correct SKU/address/artwork mapping, and PNG dimensions/transparency/ink bounds.
- Desktop and mobile storefront interactions: color, fit, unavailable fitted natural variant, size, size guide, Escape dismissal, timestamp capture and bag. No page errors or horizontal overflow at 1440px or 390px.
- A real Stripe sandbox hosted checkout completed for $32.00. The returned timestamp matched the captured value.
- Stripe's real webhook submitted Prodigi sandbox order `ord_1170501`; Prodigi reported asset download `Complete` with no order issues.
- Duplicate signed webhook returned 200 and retained the same Prodigi order ID; invalid webhook signature returned 400.
- Final deployment smoke checks also confirmed branded Stripe checkout, a declined test card remaining unpaid, checkout cancellation preserving the bag, signed-artwork access control, and server-side price tampering rejection.
- Detailed evidence and screenshots are in the local, git-ignored `artifacts/` folder.

## Development

Node 20.9+ and npm. Copy `.env.example` to `.env.local` and set credentials. Use a stable public `SITE_URL` when testing Prodigi asset download; it cannot download localhost artwork.

```sh
npm ci
npm run dev
npm test
npm run build
```

`npx tsx scripts/retry-fulfillment.ts cs_test_...` safely retries a paid order. Use the same environment and signing secret as its deployment. Stripe automatically retries webhooks that return 500; the script provides manual reconciliation after that retry period.

## Architecture

- Next.js App Router, React, TypeScript, plain responsive CSS, self-hosted DM Sans / DM Mono / Instrument Serif, Lucide icons.
- `app/store.tsx`: live tee, fit/color/size selector, captured bag, size guide, FAQs. The bag is convenience state in browser local storage, not an order database.
- `lib/catalog.ts`: server-controlled $32.00 USD price, allowed variants, timestamp freshness rules. One tee per checkout; free US standard shipping.
- `POST /api/checkout`: strict Zod input validation, same-origin browser checks, live Prodigi variant verification, idempotent Stripe Checkout creation. Customers cannot set prices or upload arbitrary artwork.
- `POST /api/webhooks/stripe`: raw-body Stripe signature validation, paid status verification against Stripe, automated fulfillment. Unrelated events are ignored. Failed fulfillment returns 500 for retry.
- `lib/fulfillment.ts`: server-retrieved order data, paid/complete/price/currency/store checks, permanent Prodigi idempotency key derived from the Checkout session. Stripe metadata durably records the Prodigi order ID and retry state. A timeout after print submission is safe to retry because Prodigi remembers the idempotency key indefinitely.
- `GET /api/artwork`: HMAC-bound, versioned PNG asset. DM Mono glyphs become vector outlines before Sharp rasterizes a transparent 4665×5844 PNG at 300 DPI; the timestamp is approximately 8 inches wide in the intended US print area. No server font installation is needed. Print placement still requires a physical sample before live sales.
- `GET /api/orders`: receipt capability keyed by the unguessable Stripe Checkout session ID. Returns only product/payment/fulfillment status. Reads current Prodigi state and tracking when available. No customer PII is returned.
- `/success`: polls status for about one minute and supports manual refresh; the webhook fulfills even if this page is never opened.
- `/policies`: honest test-store policies and the live-launch requirements.

Products were verified directly with the sandbox product API: `GLOBAL-TEE-GIL-64000` (unisex: black/white/natural) and `GLOBAL-TEE-GIL-64000L` (fitted: black/white), sizes S–2XL. All offered combinations list US shipping availability. This is catalog validation, not a real-time warehouse stock guarantee.

## Before accepting real orders

1. **Claim the Stripe sandbox before September 12, 2026.** Activate/verify your real Stripe business account separately. Review merchant identity, payout setup, receipts, and support details. Claiming a sandbox alone does not turn this store live.
2. **Order physical samples from Prodigi.** Confirm blank quality, size measurements, print placement, tone, and delivered cost for both fits. Generated preview imagery is illustrative. Templates can differ by fulfillment region; samples are necessary before promising exact physical placement. Review shipping estimates and the $32 delivered margin against actual production quotes.
3. **Finish business operations.** Add the seller identity and support contact, finalize returns/privacy/terms, decide sales-tax handling and registrations, enable receipts, and establish refund/cancellation handling. The current code does not compute sales tax, automate refunds/cancellations, send custom email, or operate a returns portal.
4. **Configure live services.** Set live `STRIPE_SECRET_KEY`, live `PRODIGI_API_KEY`, `PRODIGI_ENV=live`, `NEXT_PUBLIC_STORE_MODE=live`, and `LIVE_ORDERS_ENABLED=true`. Create a live Stripe webhook for `checkout.session.completed` and `checkout.session.async_payment_succeeded`, then set its `STRIPE_WEBHOOK_SECRET`. Update the test-specific policy and shipping copy before launch. Keep test and live environments separate; server guards reject a mixed Stripe/Prodigi environment.
5. **Use a permanent domain and asset secret.** Set `SITE_URL` to the canonical public domain; Stripe redirects and webhook registration must match. Keep `ARTWORK_SIGNING_SECRET` stable for outstanding orders and preserve version-1 artwork rendering. If rotating, retain old-key verification until all print assets are downloaded. Vercel deployment protection must not block Stripe or Prodigi.
6. **Add launch operations.** Configure Vercel firewall/rate limits and error/webhook failure alerts, then monitor Stripe/Prodigi dashboards. This small-store implementation uses durable Stripe metadata and provider idempotency, without a separate database, queue, automated reconciliation job, stock feed, or merchant admin app. For volume, add these and a defined retry/review workflow. Fulfillment issues after asset download are visible in Prodigi and on receipt refresh but do not trigger custom notifications.
7. **Deploy and smoke-test.** `vercel deploy --prod`, verify the canonical alias still points at the latest deployment, and run one carefully controlled live transaction only when you intend a real charge and physical print.

## Asset provenance

The tee mockup and social card were created with the built-in image-generation tool. Main mockup: `public/images/tee-black.webp` (original PNG retained). Share card: `public/og.png`. Live numbers are real DOM text; the production artwork is separately generated from the same frozen timestamp. Light-color previews use a CSS color treatment and are illustrative, not calibrated photos of the actual garments.

Prompt briefs: a front-facing plain black cotton crewneck, isolated on a transparent background with soft studio lighting and no graphics; and an ivory/lavender editorial social card reading “datetime.store”, “Time flies. Wear it.”, and “A souvenir of right now.” with a black timestamp tee and small star motifs.

The unprinted on-model product photo is sourced from [Prodigi's Gildan 64000 product page](https://www.prodigi.com/products/mens-clothing/t-shirts/classic/gildan-64000/). Confirm supplier image usage rights for your commercial launch. Font licenses are retained under `public/fonts/licenses/`.
