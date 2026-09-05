Done — deployed at [datetime.store](https://benchmark-20260905-beauty-high-code-one.vercel.app).

Built:

- Live millisecond timestamp tee preview
- Fitted/unisex and S–XL selectors
- Responsive whimsical storefront design
- Stripe Checkout integration with demo fallback
- Prodigi v4 sandbox fulfillment webhook
- Dynamic PNG artwork endpoint for Prodigi
- Success/cancel pages

Testing:

1. Open the site.
2. Change fit and size.
3. Click “make it mine.”
4. Demo checkout completes without charging.

Prodigi sandbox smoke-tested successfully with order `ord_1170508`; sandbox orders are not produced or charged. [Prodigi API docs](https://www.prodigi.com/print-api/docs/reference/)

Known gaps:

- No usable Stripe account secret or webhook signing secret was available, so production is currently in explicit demo mode.
- Add `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` in Vercel, then set `CHECKOUT_DEMO_MODE=false`.
- Configure Stripe webhook: `/api/webhooks/stripe`, event `checkout.session.completed`. [Stripe Checkout docs](https://docs.stripe.com/payments/checkout)
- Order storage/tracking UI is not included yet.
- Prodigi is still pointed at sandbox; switch to live only after verifying pricing, shipping, tax, and legal settings.