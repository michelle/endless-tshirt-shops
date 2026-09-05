Deployed: **[datetime.store rebuild](https://benchmark-20260905-minimal-high-cod.vercel.app)**

It uses Stripe test payments and Prodigi sandbox fulfillment. No real charges or shipments.

To test:

1. Choose a fit and size, then click **Make this moment yours**.
2. Enter fictitious US shipping details.
3. Pay with **4242 4242 4242 4242**, any future expiry, and any three-digit CVC.
4. Confirm the order page shows your frozen timestamp and Prodigi acceptance.

Verified both fits through Stripe payment → webhook → Prodigi, including artwork downloads and duplicate recovery. All 12 automated tests passed.

Remaining steps:

- **Claim the Stripe sandbox before September 12, 2026:** [private claim instructions](/var/folders/mq/v8s9bp2x5gg6gvywwjfszb8r0000gn/T/benchmark-workspace.C91vN2/work/stripe-sandbox.md).
- Manually review desktop/mobile checkout and order physical samples. No browser backend was available here.
- Before real sales, configure live credentials, taxes, customer emails, support details, and final shipping/return policies.

The [full handoff](/var/folders/mq/v8s9bp2x5gg6gvywwjfszb8r0000gn/T/benchmark-workspace.C91vN2/README.md) includes setup, test evidence, operational limits, and launch instructions.