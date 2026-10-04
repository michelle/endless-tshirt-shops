Deployed: [ELSEWHERE · elsewhere-personal-prints.hazelcough.chatgpt.site](https://elsewhere-personal-prints.hazelcough.chatgpt.site)

Customers personalize a shirt with a meaningful place, date, dedication, and color palette. Includes live previews, downloadable print artwork, sizing, and order tracking.

**Payments remain blocked:** no Stripe credentials were provided. The integration is built, but checkout is disabled, so this is not yet a fully functioning sales store.

To test:

1. Try personalization and download a print proof now.
2. Add `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` to the hosted configuration, register the webhook, and redeploy.
3. Complete Stripe test checkout using `4242 4242 4242 4242`, a future expiry, and any CVC. Confirm the resulting order in Prodigi sandbox; nothing physically ships.

The build, type checks, and 10 payment-safety tests passed. Tests cover unpaid-order blocking, payment verification, duplicate prevention, and fulfillment retries. A real end-to-end payment remains unverified.

Before production, complete that test, approve physical shirt samples, configure taxes and live credentials, publish merchant/support/returns policies, and add operational monitoring. Current scope is US delivery, black shirts, S–2XL, one shirt per checkout.

[Setup, testing instructions, and production checklist](/private/var/folders/mq/v8s9bp2x5gg6gvywwjfszb8r0000gn/T/benchmark-workspace.6bmmST/elsewhere/README.md).