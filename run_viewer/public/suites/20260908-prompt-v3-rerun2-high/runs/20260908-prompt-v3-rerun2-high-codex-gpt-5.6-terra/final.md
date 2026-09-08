Deployed: [Signal Foundry](https://benchmark-20260908-prompt-v3-rerun2-nine.vercel.app)

It’s a one-of-one “field signal” DTG tee store: customer details generate a live preview and a 2400×3000 print PNG. Payment is gated through Stripe; only a server-verified paid checkout session can submit the order to Prodigi. Prodigi sandbox product/quote integration is validated.

To test checkout, add these Vercel Production environment variables, then redeploy:

- `STRIPE_SECRET_KEY` — Stripe test secret key
- `STRIPE_WEBHOOK_SECRET` — webhook signing secret for `/api/webhook/stripe`

Then complete a Stripe test checkout; the webhook submits the paid order to Prodigi sandbox. The success page also safely retries fulfilment with Prodigi idempotency protection.

Known gaps before live sales:

- Stripe credentials were not provided, so checkout currently fails closed rather than accepting unpaid orders.
- Prodigi is configured for sandbox, which never prints or ships. Switch `PRODIGI_BASE_URL` to `https://api.prodigi.com` and use a live key.
- Shipping is a fixed $5.50 and limited to US, Canada, and UK; production should use live Prodigi quotes, tax handling, and broader shipping rules.
- Add a database/queue plus verified Prodigi callbacks for order history, retries, shipment tracking, and support operations.