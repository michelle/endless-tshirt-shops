Deployed: [datetime.store rebuild](https://benchmark-20260905-minimal-high-cod-six.vercel.app)

It recreates the live timestamp tee concept, fitted/unisex selection, responsive checkout, Stripe Payment Intents, signed Stripe webhook, and Prodigi sandbox fulfillment. I verified a complete sandbox payment-to-Prodigi flow; sandbox orders `ord_1170543` and `ord_1170546` were created.

To test it:

1. Open the deployed site.
2. Use a US address for Fitted, or choose Unisex for international addresses.
3. Use Stripe test card `4242 4242 4242 4242`, any future expiration, and any CVC.
4. Submit. You should see the Prodigi order confirmation.

Known gaps / next steps:

- Prodigi is configured for sandbox, so orders are not physically produced or charged. Switch `PRODIGI_API_BASE` to `https://api.prodigi.com` and add a live Prodigi key to go live. [Prodigi documents the sandbox/live distinction here](https://www.prodigi.com/faq/print-api/).
- Stripe uses a newly provisioned temporary sandbox that expires on September 12, 2026. Claim it from this workspace with `stripe sandbox claim`, then replace it with your own Stripe live keys and create a production webhook secret.
- Pricing is fixed at $22.50 with free shipping; taxes, real-time shipping quotes, inventory checks, transactional order emails, and an order-status portal still need product/operations decisions.
- The current fulfillment retry path relies on Stripe webhook retries and Prodigi idempotency; for a commercial launch, add durable order storage and monitoring.