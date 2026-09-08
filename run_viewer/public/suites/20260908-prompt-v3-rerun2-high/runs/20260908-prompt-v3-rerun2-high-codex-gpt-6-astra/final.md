Deployed [Daymark](https://benchmark-20260908-prompt-v3-rerun2.vercel.app): personalized contour-art tees generated from each customer’s place, date, coordinates, and message.

**Stripe checkout and Prodigi fulfillment work in sandbox mode.** A successful $44 test payment created Prodigi order `ord_1171056`. Concurrent retries returned the same order; a declined payment created none. All 12 automated tests passed.

To test:

1. Customize a shirt, select your size, and approve the artwork.
2. Check out using `4242 4242 4242 4242`, a future expiry, any three-digit CVC, and a US address. These are [Stripe test credentials](https://docs.stripe.com/testing).
3. Check the confirmation page for payment and print-order status. Nothing is physically shipped.

Before production:

- **Claim the Stripe sandbox by September 15, 2026** using the [private claim instructions](/var/folders/mq/v8s9bp2x5gg6gvywwjfszb8r0000gn/T/benchmark-workspace.A29YiB/.private/stripe-sandbox.md).
- Complete merchant onboarding, configure live Stripe and Prodigi credentials, and implement tax collection.
- Add support details, final policies, customer notifications, and fulfillment alerts.
- Approve a physical print sample and perform browser/device testing.

Known limits: US delivery, one shirt per checkout, and manual refunds/cancellations. Browser interaction and physical print quality remain unverified.

[Full testing and production guide](/var/folders/mq/v8s9bp2x5gg6gvywwjfszb8r0000gn/T/benchmark-workspace.A29YiB/README.md) · [Source code](/tmp/daymark-source.zip)