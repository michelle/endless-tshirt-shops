Deployed: **[Open datetime.store](https://benchmark-20260905-unserious-high-codex-gpt-6-astra.vercel.app)**

Live timestamps, black tees, and deeply unnecessary copy. Stripe Checkout and Prodigi fulfillment are connected.

To test:

1. Choose a fit and size, then click **Make this moment a shirt**.
2. Enter a US address and card **4242 4242 4242 4242**, any future expiry, and any three-digit CVC.
3. After checkout, check the order status and download your timestamp artwork.

Verified a Stripe test payment → Prodigi sandbox order **ord_1170586**, successful webhook delivery, and duplicate-safe retries. The production build and security tests pass.

Known gaps: US-only, test payments, no physical shipping. Browser and physical-print QA remain. Real sales need live credentials, finalized policies/support, tax configuration, and customer notifications.

**Next:** Claim the Stripe sandbox before **September 13, 2026**, using the private [claim link file](/private/var/folders/mq/v8s9bp2x5gg6gvywwjfszb8r0000gn/T/benchmark-workspace.CjspeA/SANDBOX_CLAIM.txt).

Full testing, deployment, and launch instructions are in the [handoff guide](/private/var/folders/mq/v8s9bp2x5gg6gvywwjfszb8r0000gn/T/benchmark-workspace.CjspeA/README.md).