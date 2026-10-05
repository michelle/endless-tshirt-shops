Deployed publicly: **[Field Notes — Wear your somewhere](https://field-notes-wear.hazelcough.chatgpt.site)**.

Customers personalize an original landscape shirt with their place, words, date, and design variation. Live previews and production-ready artwork downloads work.

**The payment requirement remains blocked:** no Stripe credentials were available. Stripe Checkout and payment-verified Prodigi fulfillment are implemented, but checkout stays disabled. No payments or print orders were submitted.

To test:

1. Open the store, customize a shirt, and download its print proof.
2. Add `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`, then redeploy.
3. Use Stripe’s test card `4242 4242 4242 4242`; verify exactly one Prodigi sandbox order appears.

Build, browser, artwork, and simulated payment-security tests passed. Actual paid checkout → Prodigi fulfillment still needs verification.

Before production, configure live accounts, approve physical samples, and finalize taxes, customer support, returns, notifications, and fulfillment monitoring. The current store supports US delivery, natural shirts, and one shirt per order.

[Setup instructions and known gaps](/private/var/folders/mq/v8s9bp2x5gg6gvywwjfszb8r0000gn/T/benchmark-workspace.DspJOj/field-notes/README.md).

Sample artwork: :codex-file-citation{path="/private/var/folders/mq/v8s9bp2x5gg6gvywwjfszb8r0000gn/T/benchmark-workspace.DspJOj/field-notes/output/pdf/field-notes-print.pdf" purpose="output"}