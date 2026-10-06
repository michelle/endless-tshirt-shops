# Skyprint

Custom star-map tees. The customer picks a date, time and place; we compute the real sky for that moment and print it on a shirt via Prodigi (DTG). Payment is Stripe Checkout; the Prodigi order is created only after Stripe reports the session as paid.

## Run locally

    npm install
    PRODIGI_API_KEY=<sandbox key> npm run build && PRODIGI_API_KEY=<sandbox key> npm start

With no Stripe key and a `test_` Prodigi key the store runs in demo payment mode (no money moves, sandbox Prodigi order only). Demo mode is disabled automatically with a live Prodigi key.

## Environment variables

| Name | Purpose |
| --- | --- |
| `PRODIGI_API_KEY` | Prodigi key. Sandbox keys start with `test_`; a live key switches to the live API. |
| `STRIPE_SECRET_KEY` | Stripe secret key (`sk_test_...` first, then `sk_live_...`). |
| `STRIPE_WEBHOOK_SECRET` | Signing secret of the webhook endpoint below. |
| `SIGNING_SECRET` | Random string used to sign print-file URLs. |
| `SITE_URL` | Public https origin, e.g. `https://shop.example.com`. Prodigi downloads print files from here. |

## Deploy (Vercel)

    npm i -g vercel && vercel login && vercel --prod

Set the variables above in the project settings, then add a Stripe webhook to `https://<site>/api/webhook` for `checkout.session.completed` and `checkout.session.async_payment_succeeded`. `GET /api/health` reports what is configured.

## Tests

    npm test
