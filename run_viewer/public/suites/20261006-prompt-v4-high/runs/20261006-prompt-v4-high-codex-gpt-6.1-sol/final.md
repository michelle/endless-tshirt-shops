Deployed: **[Somewhere Yours](https://somewhere-yours-studio.hazelcough.chatgpt.site)**.

The concept turns a meaningful place into an original landscape print, customized with coordinates, date, caption, colors, and shirt size. It includes live previews and transparent, 300 DPI print files.

**Checkout is not active yet:** only the Prodigi sandbox key was available. Stripe Checkout and payment-verified fulfillment are implemented, but require your Stripe credentials. The store therefore isn’t fully operational yet.

To test:

1. Open the store, customize a shirt, and download its print PNG.
2. Configure `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` in hosting secrets, then redeploy. The webhook endpoint is `/api/stripe/webhook`.
3. Use Stripe test card `4242 4242 4242 4242`, a future expiry, and any CVC. A successful checkout should produce a Prodigi sandbox order reference. Sandbox orders won’t ship.

Desktop/mobile checks and **13 automated tests passed**, including unpaid-order blocking, webhook verification, duplicate prevention, and fulfillment retries. The real Stripe-to-Prodigi flow remains untested.

Before production, connect live credentials, inspect a physical sample, configure taxes, publish support and returns policies, and add order emails, merchant administration, monitoring, and background retries.

Full setup, test instructions, and known gaps are in the [project guide](/private/var/folders/mq/v8s9bp2x5gg6gvywwjfszb8r0000gn/T/benchmark-workspace.rkhHjb/somewhere-yours/README.md).