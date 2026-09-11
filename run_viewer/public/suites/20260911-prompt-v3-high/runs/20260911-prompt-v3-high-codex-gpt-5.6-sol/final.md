Deployed Orbitline: **[Open the store](https://benchmark-20260911-prompt-v3-high-c-gray.vercel.app)**

The store includes live personalization, server-controlled pricing, Stripe Checkout integration, signed print-ready artwork, and webhook-gated Prodigi fulfillment. Prodigi only receives an idempotent order after Stripe reports `payment_status: paid`, following Stripe’s recommended [webhook fulfillment flow](https://docs.stripe.com/checkout/fulfillment).

### Important gap

Stripe credentials weren’t available, so checkout currently fails closed instead of accepting payments. `/api/health` reports this accurately.

To enable test payments:

1. Add `STRIPE_SECRET_KEY` to the Vercel production environment.
2. Create a Stripe test webhook for:
   `https://benchmark-20260911-prompt-v3-high-c-gray.vercel.app/api/webhook`
3. Subscribe to `checkout.session.completed` and `checkout.session.async_payment_succeeded`.
4. Add its signing secret as `STRIPE_WEBHOOK_SECRET`.
5. Redeploy, then pay using Stripe’s `4242 4242 4242 4242` test card.

The resulting order will appear in Prodigi’s sandbox, which does not charge or physically fulfill orders. [Prodigi API reference](https://www.prodigi.com/print-api/docs/reference/)

### Production checklist

- Replace the Prodigi sandbox URL/key with live credentials.
- Replace Stripe test credentials and webhook with live versions.
- Configure sales tax, refunds, terms, privacy policy, support email, and a custom domain.
- Confirm the $44 price across sizes and US shipping zones.
- Add order-status emails or an admin/order database if you need visibility beyond Stripe and Prodigi dashboards.

The product mockup was created using built-in image generation from a front-facing blank navy tee prompt and saved at [orbitline-navy-tee.png](</var/folders/mq/v8s9bp2x5gg6gvywwjfszb8r0000gn/T/benchmark-workspace.8FJ5ku/public/orbitline-navy-tee.png>).