[Open Personal Orbit](https://benchmark-20260907-prompt-v3-high-codex-gpt-6-astra.vercel.app) — personalized shirts generated from a customer’s place, date, words, and color palette.

**The storefront is deployed, but customers cannot pay yet:** the supplied Stripe configuration was empty. Stripe Checkout and payment-gated Prodigi fulfillment are implemented; checkout safely blocks until credentials are connected.

To test payments:

1. Run `stripe login --config "$BENCHMARK_STRIPE_CONFIG"`.
2. Run `npm run connect:stripe`, then `vercel --prod --yes`.
3. Customize a shirt and checkout using Stripe’s test card `4242 4242 4242 4242`, a future expiry, and any three-digit CVC.
4. Confirm the order appears in Prodigi sandbox. Refreshing or replaying the payment event should not create duplicates.

**Verified:** 11 automated tests and 13 deployed HTTP checks passed, including payment safeguards and high-resolution print generation. No actual Stripe-to-Prodigi payment flow or physical shipment was completed.

Before production, you’ll need live Stripe and Prodigi credentials, tax configuration, approved physical samples, finalized policies/support contact details, operational alerts, and browser testing. Refunds and cancellations currently require manual handling.

The [README](/var/folders/mq/v8s9bp2x5gg6gvywwjfszb8r0000gn/T/benchmark-workspace.fVQJCL/README.md) contains setup commands, negative-payment tests, recovery instructions, and the production checklist.