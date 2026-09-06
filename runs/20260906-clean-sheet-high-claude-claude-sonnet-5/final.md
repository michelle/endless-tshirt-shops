## Done — **STATUS/CODE** is live

**Live URL:** https://benchmark-20260906-clean-sheet-high-coral.vercel.app
(Vercel project: `benchmark-20260906-clean-sheet-high-claude-claude-sonnet-5`)

### The concept
A t-shirt store for developers: every shirt is a real HTTP status code, screen-printed the way a terminal renders it — big monospace numeral, color-coded by class (2xx green, 3xx blue, 4xx amber, 5xx red), on a black tee. 10 products including the proven crowd-pleasers (**404 Not Found**, **418 I'm a Teapot**, **500 Internal Server Error**) alongside 200/201/301/304/403/429/503. Prices $29–$32.

### How it's built
- **Next.js 16 (App Router)** storefront, deployed on Vercel.
- **Design pipeline**: every shirt's print file and product-photo mockup is generated programmatically (SVG → sharp → PNG) — no stock art. Print files are full-res (4665×5844px, matching Prodigi's exact front-print spec).
- **Stripe Checkout** (test mode) handles payment + shipping address collection.
- **Prodigi Print API** (sandbox) receives a webhook-triggered order on `checkout.session.completed`, printing on `GLOBAL-TEE-GIL-64000` (Gildan 64000 tee).

### How to test it
1. Go to the live URL, pick any shirt, choose a size, hit **Buy now**.
2. On the Stripe-hosted checkout page, use test card **4242 4242 4242 4242**, any future expiry, any CVC, any shipping address.
3. You'll land on `/success` showing the order confirmation. Behind the scenes, Stripe's webhook fires and a real order gets created in Prodigi's **sandbox** (verified working — I placed a live test order via the API and confirmed Prodigi successfully fetched the print file from the deployed site and started production tracking).

I verified every stage independently end-to-end (Stripe session creation, webhook signature verification against the live endpoint, and a real Prodigi sandbox order using a live print-file URL) — I did not click through an actual browser checkout myself, so you're the first to complete the full flow live.

### Gaps you should know about
- **Stripe sandbox is claimable and expires 2026-09-13 (7 days).** Claim it into your own Stripe account before then: https://dashboard.stripe.com/onboard_sandbox/YWNjdF8xVUNnWUM4N3c2Wkd2bURoLDE3ODkzMjEzMzYv100MmHYF4Mj — otherwise the keys stop working.
- No order database — order state lives only in Stripe/Prodigi dashboards, nothing queryable from the site itself.
- No idempotency guard on the webhook, so a Stripe retry after a transient Prodigi failure could double-order (low risk, but worth a merchant-reference dedupe check before this touches real money).
- Shipping is limited to ~40 curated countries; sizes are S–2XL only.
- Everything is running against **sandbox/test** keys — nothing here is production-ready for real payments or real shipping until you swap in live Stripe keys and a production Prodigi key.
- No automated tests; I verified manually via curl/API calls rather than a test suite.

### Next steps for you
1. Claim the Stripe sandbox (link above) if you want to keep it beyond 7 days.
2. Click through an actual test purchase in the browser to see the polish end-to-end.
3. When ready to go live: swap `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET` for live Stripe keys and the Prodigi key for a production one, in Vercel's project env settings.
