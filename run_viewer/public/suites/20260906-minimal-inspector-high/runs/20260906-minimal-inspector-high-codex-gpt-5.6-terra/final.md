Deployed: https://benchmark-20260906-minimal-inspecto-plum.vercel.app

Test it:

1. Choose fit and size, then click “Get this timestamp.”
2. In Stripe Checkout, use `4242 4242 4242 4242`, any future expiry, any CVC, and a US address.
3. You’ll return to the confirmation page. Stripe’s webhook then creates a Prodigi sandbox order using the timestamp captured at checkout.

I verified the hosted site, Stripe Checkout session creation, print-art PNG, and both Prodigi garment payloads. The storefront includes a product mockup built specifically for the new design.

Known gaps / next steps:

- Fulfillment is intentionally using Prodigi sandbox, so test orders are not printed or shipped. Prodigi confirms its sandbox neither charges nor fulfills orders. [Prodigi API docs](https://www.prodigi.com/print-api/docs/reference/)
- Before real launch, replace the sandbox Prodigi key/base URL with live credentials, replace Stripe test credentials with live ones, and create a live Stripe webhook.
- Pricing is currently the original $22.50 with free US shipping; add live Prodigi quoting, tax handling, and international shipping rules before accepting real payments.
- There is no customer-facing tracking/status email flow yet; Prodigi’s order-status webhooks would be the natural next addition.

Stripe’s official test-card guidance is here: [Stripe testing](https://docs.stripe.com/testing?locale=en-GB).
