Deployed: **[Open datetime.store](https://datetime-20260906-6b537472.vercel.app)**

The rebuild includes the live timestamp, fit/size selection, Stripe Checkout, and duplicate-safe Prodigi fulfillment. It’s currently in **test mode**.

To test:

1. Choose a fit and size, then click **Make this moment yours**.
2. Use card **4242 4242 4242 4242**, any future expiry, any three-digit CVC, and a US address. [Stripe testing instructions](https://docs.stripe.com/testing).
3. Confirm the return page shows your captured timestamp and a Prodigi order reference.

Verified: production build, six commerce tests, checkout creation, payment guards, print artwork, and sandbox orders for both cuts. Duplicate submissions returned the same order IDs. Dependency audit found zero vulnerabilities.

Known gaps: the full browser purchase journey remains untested; physical print quality needs samples. Live tax, customer emails, support policies, and operational monitoring still need setup.

**Next:** [Claim the Stripe sandbox]([redacted-private-link]) before **September 13, 2026**, complete a test checkout, then follow the [launch checklist in README.md](/var/folders/mq/v8s9bp2x5gg6gvywwjfszb8r0000gn/T/benchmark-workspace.CoI1Bc/README.md) before enabling real orders.
