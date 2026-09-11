Deployed: [Future Fossil Club store](https://benchmark-20260911-prompt-v3-high-c-rosy.vercel.app)

It sells one-of-one “museum exhibit” DTG tees: customers personalize a name, place, ritual, year, color, and size; the site generates print-ready vector artwork for their shirt.

Payment/fulfillment flow is implemented securely: Stripe Checkout collects payment, then a verified successful Stripe webhook sends the paid order to Prodigi. The Stripe session ID is used as a Prodigi idempotency key to prevent duplicate fulfillment. This follows Stripe’s webhook-first fulfillment guidance and Prodigi’s order API. [Stripe](https://docs.stripe.com/checkout/fulfillment) · [Prodigi](https://www.prodigi.com/print-api/docs/reference/)

How to test:

1. Open the store and customize a tee—the live preview should update.
2. Add `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` to the Vercel project.
3. In Stripe, register `https://benchmark-20260911-prompt-v3-high-c-rosy.vercel.app/api/stripe-webhook` for:
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
4. Redeploy, then test with Stripe’s `4242 4242 4242 4242` test card.
5. A completed test payment will create a Prodigi sandbox order. Prodigi is already configured in sandbox mode, so nothing ships or incurs production charges.

Known gap: Stripe credentials were not provided, so checkout currently returns a safe “not configured” response rather than accepting payments. Prodigi sandbox is configured.

For production: add live Stripe keys and a live webhook secret, switch `PRODIGI_SANDBOX` to `false` with a live Prodigi key, connect a custom domain, validate real Prodigi quotes/margins and tax treatment, and add your returns/privacy/terms policies. The initial storefront supports US shipping only, with standard shipping included in the $44 price.