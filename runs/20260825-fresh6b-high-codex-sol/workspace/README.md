# datetime.store

A production-oriented rebuild of the original datetime.store: choose a fit and size, capture the current Unix timestamp in milliseconds, pay through Stripe Checkout, and send the paid order to Prodigi for print-on-demand fulfillment.

## Local development

1. Copy `.env.example` to `.env.local` and add Stripe test/sandbox credentials.
2. Run `npm install` and `npm run dev`.
3. Forward Stripe events with `stripe listen --forward-to localhost:3000/api/webhooks/stripe` and copy its `whsec_…` value into `.env.local`.
4. Open `http://localhost:3000`, select a shirt, and use Stripe test card `4242 4242 4242 4242` with any future expiry and CVC.

Prodigi defaults to its sandbox API. Sandbox orders are validated and recorded but never printed, shipped, or charged.

## Verification

```bash
npm test
npm run typecheck
npm run build
curl http://localhost:3000/api/health
```

## Production launch

Use a claimed Stripe account with live keys, create a live Stripe webhook for `/api/webhooks/stripe`, replace `PRODIGI_API_KEY` and `PRODIGI_API_URL` with live credentials/URL, set the canonical `NEXT_PUBLIC_SITE_URL`, validate unit economics and tax settings, then run a physical sample order before accepting traffic.
