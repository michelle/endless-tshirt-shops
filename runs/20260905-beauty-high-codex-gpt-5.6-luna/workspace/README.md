# datetime.store

A whimsical, made-to-order timestamp tee storefront inspired by the original datetime.store. The shop captures the shopper's current moment in the browser, sends the payment step to Stripe Checkout, and creates a Prodigi sandbox order after Stripe confirms payment.

## Test the deployed build

Open the production URL:

https://benchmark-20260905-beauty-high-code-one.vercel.app

Try the fit and size controls, then choose **make it mine**. The current deployment has `CHECKOUT_DEMO_MODE=true`, so the button lands on the confirmation screen without charging a card. The timestamp preview is live and the generated artwork is available at:

`/api/artwork?timestamp=2026-09-05T17%3A30%3A00.123Z&style=unisex`

## Turn on real Stripe test checkout

Add these Vercel production environment variables, then redeploy:

- `STRIPE_SECRET_KEY` — a Stripe test-mode secret key (`sk_test_...`)
- `STRIPE_WEBHOOK_SECRET` — the signing secret for `/api/webhooks/stripe`
- `PRODIGI_API_KEY` — the Prodigi sandbox key
- `NEXT_PUBLIC_APP_URL` — the canonical production URL
- `CHECKOUT_DEMO_MODE=false`

In Stripe, point a webhook at:

`https://benchmark-20260905-beauty-high-code-one.vercel.app/api/webhooks/stripe`

Subscribe to `checkout.session.completed`. Use Stripe's test card `4242 4242 4242 4242`, any future expiry, and any CVC. A successful webhook submits the order to Prodigi's sandbox using `GLOBAL-TEE-BC-3001` for unisex or `GLOBAL-TEE-BC-3003` for fitted.

## Known gaps before going live

- The current Vercel deployment is intentionally no-charge demo mode because no Stripe account secret or webhook signing secret was available in the build environment.
- Only US, CA, GB, AU, NZ, DE, FR, and NL are enabled in the Stripe shipping selector.
- There is no persistent order database or customer-facing tracking page yet. Stripe and Prodigi remain the systems of record.
- Prodigi sandbox order creation is wired and smoke-tested; switch the API base URL from `api.sandbox.prodigi.com` to `api.prodigi.com` only after confirming product, shipping, tax, and legal settings in a live Prodigi account.
