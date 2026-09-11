Built and deployed: [PATCHWORK Signal Goods](https://benchmark-20260911-prompt-v3-high-codex-gpt-56-luna-48josuiuw.vercel.app/)

Stable alias: [benchmark-20260911-prompt-v3-high-c-chi.vercel.app](https://benchmark-20260911-prompt-v3-high-c-chi.vercel.app/)

Highlights:

- One-of-one signal-map tee customized by name, mood, note, color, size, and quantity.
- Stripe Checkout integration with payment verification before fulfillment.
- Prodigi v4 fulfillment using `GLOBAL-TEE-BC-3001` and a server-rendered 2490×3510 PNG front asset. [Prodigi API](https://www.prodigi.com/print-api/docs/reference/) · [Product SKU](https://www.prodigi.com/products/mens-clothing/t-shirts/classic/bella-canvas-3001/)
- Prodigi sandbox key configured in Vercel.
- Final deployed sandbox order tested successfully: `ord_1171669`, `InProgress`, zero issues.
- Production build passes with zero production audit findings.

To test:

1. Customize the tee.
2. Open the bag → Checkout.
3. Enter any test name/email.
4. Click “Complete sandbox payment.”
5. Confirm the Prodigi order confirmation screen.

Known gaps:

- No Stripe credentials were provided, so the deployed checkout is currently an explicit non-charged sandbox flow.
- Add `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` to enable live/test card payments.
- Set up the Stripe webhook at `/api/webhooks/stripe`.
- Switch `PRODIGI_ENVIRONMENT=live` and use a live Prodigi key before selling.
- Add durable order storage, email/tracking notifications, taxes, refunds, policies, and fraud/rate-limit controls.

Implementation notes are in [README.md](/var/folders/mq/v8s9bp2x5gg6gvywwjfszb8r0000gn/T/benchmark-workspace.6y6Mxb/README.md).