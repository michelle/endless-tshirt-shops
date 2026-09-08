Deployed Star Signal Studio: [live store](https://benchmark-20260907-prompt-v3-rerun-eight.vercel.app/)

It creates a live, personalized cosmic field-note shirt from the buyer’s name, place, sign, palette, size, and tee color. The artwork is generated as a print-ready PNG and the Prodigi sandbox integration is configured in Vercel.

How to test:

- Open the store, adjust the personalisation inputs, and confirm both previews update.
- Prodigi product/variant quoting was validated against the sandbox for the organic DTG tee.
- Checkout currently fails closed with a clear setup message because Stripe credentials were not provided in this environment. No shirt can reach Prodigi before a verified Stripe `checkout.session.completed` webhook.

To activate payments:

1. Add `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` as Production environment variables in Vercel.
2. In Stripe, register `https://benchmark-20260907-prompt-v3-rerun-eight.vercel.app/api/stripe-webhook` for `checkout.session.completed`.
3. Redeploy, then test with Stripe card `4242 4242 4242 4242`. A successful test payment submits only a sandbox Prodigi order.

Production gaps to address:

- Switch to live Stripe keys and `https://api.prodigi.com` with a live Prodigi key.
- Configure real shipping/taxes, refunds, policies, support emails, and a durable order/event store.
- Confirm regional pricing and fulfillment availability before selling internationally.