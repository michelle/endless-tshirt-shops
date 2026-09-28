## Deployed

[Open Night Atlas](https://benchmark-20260928-latest-high-code-silk.vercel.app)

It’s a personalized constellation tee store: buyers choose a place, dedication, date, coordinates, size, and color. The artwork preview and high-resolution print PNG are live. Stripe Checkout and a signed, payment-gated Prodigi fulfillment webhook are implemented; the flow uses Stripe Checkout Sessions and checks for a paid session before submitting an order. ([Stripe Checkout](https://docs.stripe.com/api/checkout/sessions), [Prodigi API](https://www.prodigi.com/print-api/docs/reference/))

## Test it

You can preview and customize a design now. I verified the storefront loads and the artwork endpoint returns PNGs, including the 4665×5844 print file. Checkout currently returns **“Secure checkout is not configured yet”** because no Stripe credentials were available.

To test a purchase:

1. Add a Stripe **test** secret key as `STRIPE_SECRET_KEY` in this Vercel project’s Production environment.
2. In Stripe, configure a webhook for `https://benchmark-20260928-latest-high-code-silk.vercel.app/api/webhook` with `checkout.session.completed` and `checkout.session.async_payment_succeeded`. Add its signing secret to Vercel as `STRIPE_WEBHOOK_SECRET`.
3. Redeploy, then place a test order with Stripe’s test card `4242 4242 4242 4242`, any future expiration date, and any CVC. Check Stripe’s event log and the Prodigi sandbox dashboard for the order.

The supplied Prodigi key is configured for **sandbox**. Sandbox orders don’t print or ship. ([Prodigi environments](https://www.prodigi.com/print-api/docs/reference/))

## Gaps and production steps

Checkout cannot accept payment until the Stripe keys and webhook are configured. Before launch, switch from the Prodigi sandbox to a live Prodigi key and API host, add Stripe live credentials, and test a real sample order. Tax collection is not configured, and the displayed price and shipping charge are fixed. The app also needs a customer support contact, store policies, and an order notification and reconciliation process.

Setup notes are in [README.md](/private/var/folders/mq/v8s9bp2x5gg6gvywwjfszb8r0000gn/T/benchmark-workspace.vtRbzE/README.md).