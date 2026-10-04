Deployed: [Somewhere Studio](https://somewhere-studio.hazelcough.chatgpt.site)

The store creates personalized “wearable postcards” with original landscape artwork, the customer’s place, caption, date, and palette.

**Checkout remains blocked:** no Stripe credentials were available. The payment integration is implemented, but the store cannot accept payments yet.

To test:

- Customize a shirt, switch palettes and sizes, and download the transparent print PNG.
- Connect `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`, then republish to enable test checkout.
- Payment safety tests passed with mocked providers; actual payment-to-Prodigi fulfillment still needs verification.

Before production, complete that sandbox test, inspect a physical sample, configure live credentials and taxes, and finalize support, policies, notifications, tracking, and refunds. The base illustration is upscaled, so sample-print quality needs particular attention.

[Setup instructions, test procedure, and all known gaps](/private/var/folders/mq/v8s9bp2x5gg6gvywwjfszb8r0000gn/T/benchmark-workspace.dC6n1r/somewhere-studio/README.md)