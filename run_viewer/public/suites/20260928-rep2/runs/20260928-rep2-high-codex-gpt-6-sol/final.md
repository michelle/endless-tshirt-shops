**Our Orbit is deployed:** [Open the store](https://benchmark-20260928-rep2-high-codex.vercel.app/). Customers can personalize the shirt and see their constellation update live. The site generates a 4680 × 5790 print file for Prodigi’s Bella+Canvas 3001 tee.

**Checkout is not enabled yet.** No Stripe credentials were available, so the deployed site disables the purchase button rather than accepting a payment it cannot fulfill. The integration is built to verify Stripe’s webhook and paid status before submitting an order to Prodigi. Prodigi’s idempotency key protects against duplicate submissions. [Stripe fulfillment guidance](https://docs.stripe.com/payments/existing-customers?platform=web&ui=stripe-hosted), [Prodigi API reference](https://www.prodigi.com/print-api/docs/reference/).

To enable a full test purchase:

1. Create a Stripe **test-mode** webhook for `https://benchmark-20260928-rep2-high-codex.vercel.app/api/webhook`, subscribing to `checkout.session.completed` and `checkout.session.async_payment_succeeded`.
2. Add `STRIPE_SECRET_KEY` and that endpoint’s `STRIPE_WEBHOOK_SECRET` to the Vercel project’s Production environment, then redeploy. A publishable key is not needed for this hosted Checkout flow.
3. Buy a shirt using Stripe’s [test card `4242 4242 4242 4242`](https://docs.stripe.com/testing?numbers-or-method-or-token=tokens) and a U.S. address. Confirm the order appears in the Prodigi sandbox. Sandbox orders do not print or ship.

I verified the production site loads, the print renderer produces the required PNG, and a Prodigi sandbox shirt order succeeded. Repeating that order returned the same order ID. **A complete paid checkout remains untested** until Stripe is configured.

Before taking real orders, switch Stripe and Prodigi to live credentials together, inspect a physical sample, and set up sales tax, customer support, policies, and fulfillment alerts. The current store sells one black tee per order in sizes S–2XL and ships within the U.S. Setup details are in [README.md](</private/var/folders/mq/v8s9bp2x5gg6gvywwjfszb8r0000gn/T/benchmark-workspace.Ib1rme/README.md>).