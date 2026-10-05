Deployed publicly: **[Elsewhere — Wear your somewhere](https://elsewhere-memory-press.hazelcough.chatgpt.site)**.

Customers personalize landscape artwork with their place, date, dedication, palette, shirt color, and size. The store includes live previews, high-resolution print downloads, saved orders, and an owner ledger.

**The payment requirement remains blocked:** no Stripe credentials were available. Stripe Checkout and payment-gated Prodigi fulfillment are implemented, but the actual paid checkout → Prodigi flow is unverified. The deployed demo takes no payment and submits no shirts.

To test now:

1. Customize a tee and download its print.
2. Approve the design and select **Preview a demo order**.
3. Complete the demo confirmation, then reload to verify persistence.

I verified desktop/mobile layouts, hosted order storage, access protections, payment safety tests, and Prodigi product/quote requests.

Before production, you need to:

- Connect Stripe test credentials and its webhook; verify successful, declined, canceled, and duplicate payment events.
- Configure live Stripe and Prodigi credentials.
- Order physical samples to approve printing and fit.
- Finalize taxes, customer support, privacy/returns policies, email notifications, and operational monitoring.

Current limits include US-only delivery, one tee per order, browser-local customer order access, and manual refunds/cancellations.

Full setup, testing instructions, and gaps are in [README.md](/private/var/folders/mq/v8s9bp2x5gg6gvywwjfszb8r0000gn/T/benchmark-workspace.JVL7C4/memory-press/README.md).