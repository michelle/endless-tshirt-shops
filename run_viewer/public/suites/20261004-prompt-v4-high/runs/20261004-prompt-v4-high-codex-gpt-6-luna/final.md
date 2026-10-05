## Deployed

[Orbit & Origin — Your moment, made visible](https://orbit-and-origin.hazelcough.chatgpt.site)

The store has a live name, date, and place customizer, a shirt preview, and a transparent, print-resolution PNG design for the front of a Bella + Canvas 3001 tee. It’s priced at **$38 with free U.S. shipping**. The design is intentionally stylized rather than a scientific star chart.

## Current checkout status

The storefront is public, but **checkout is disabled until Stripe is configured**. There were no Stripe test keys available, so I couldn’t complete an end-to-end payment test. The store’s live status check confirms checkout is not ready.

To enable a test purchase, add these as deployment secrets:

- `STRIPE_SECRET_KEY` — a Stripe test-mode secret key
- `STRIPE_WEBHOOK_SECRET` — the signing secret for a webhook at `https://orbit-and-origin.hazelcough.chatgpt.site/api/stripe-webhook`

Subscribe that webhook to `checkout.session.completed` and `checkout.session.async_payment_succeeded`, then redeploy. Once checkout is enabled, customize a shirt and pay with Stripe’s test card `4242 4242 4242 4242`, any future expiry date, and any three-digit CVC. [Stripe’s testing guide](https://docs.stripe.com/testing?numbers-or-method-or-token=tokens) explains test cards. Only a verified paid event triggers the Prodigi order; Stripe recommends using webhooks for fulfillment. [Stripe fulfillment guidance](https://docs.stripe.com/checkout/fulfillment)

Orders currently go to **Prodigi’s sandbox**, which does not charge or fulfill them. You can use a paid Stripe test checkout to check that a sandbox order is created, but it will not produce or ship a shirt. [Prodigi API documentation](https://www.prodigi.com/print-api/docs/reference/)

## Gaps before production

- Replace Stripe test credentials with live credentials and configure the live webhook.
- Switch Prodigi from the sandbox endpoint and key to a live account; verify the product, shipping, and a physical sample before accepting real orders.
- Add tax handling, and decide which shipping destinations to support. Checkout currently accepts U.S. addresses only, with free shipping.
- Add customer-facing returns, privacy, and contact information, plus an operational process for monitoring failed fulfillment and handling refunds.

The build and TypeScript checks passed, and I verified the deployed storefront and its checkout status.