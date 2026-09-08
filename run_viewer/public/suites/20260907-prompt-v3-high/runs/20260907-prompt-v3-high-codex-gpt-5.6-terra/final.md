Deployed: [The 5:17 Club](https://benchmark-20260907-prompt-v3-high-c-five.vercel.app)

It’s a personalized DTG tee store: customers customize their time, name, ritual, city, color, size, and quantity. Stripe Checkout is wired so only a verified successful-payment webhook submits the final 2490×3510 print artwork to Prodigi. Prodigi sandbox and the selected Bella+Canvas tee variant were validated.

Current gap: Stripe credentials weren’t available, so checkout intentionally shows a configuration message rather than accepting payments.

To test:

1. Add `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` as Vercel production environment variables.
2. In Stripe, register `https://benchmark-20260907-prompt-v3-high-c-five.vercel.app/api/webhooks/stripe` for `checkout.session.completed` and `checkout.session.async_payment_succeeded`.
3. Redeploy, customize a tee, and pay with Stripe test card `4242 4242 4242 4242`. A paid session triggers the Prodigi sandbox order; sandbox does not manufacture or ship. [Stripe testing](https://docs.stripe.com/checkout/fulfillment) · [Prodigi sandbox](https://www.prodigi.com/print-api/docs/reference/)

For production: replace Stripe and Prodigi sandbox keys with live keys, set `PRODIGI_ENVIRONMENT=live`, update `NEXT_PUBLIC_SITE_URL` to your custom domain, configure Stripe Tax if required, and add durable order/status storage plus customer fulfillment emails.