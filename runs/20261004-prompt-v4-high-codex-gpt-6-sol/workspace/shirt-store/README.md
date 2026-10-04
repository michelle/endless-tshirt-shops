# Elsewhere, Always

A personalized t-shirt store. Customers enter a place, date, and line of text. The browser renders a transparent 3600×4400 PNG from those details. The server stores the file, creates a Stripe Checkout session, and submits a Gildan 64000 shirt to Prodigi only after a signed `checkout.session.completed` webhook and a paid-session verification.

## Test checkout

Set the Site's `STRIPE_SECRET_KEY` to a Stripe test secret key. In Stripe, create a webhook destination for `https://elsewhere-always.hazelcough.chatgpt.site/api/stripe-webhook` that listens to `checkout.session.completed`; set `STRIPE_WEBHOOK_SECRET` to its signing secret. The Prodigi sandbox key is already configured on the hosted Site. Redeploy the saved Site version after changing runtime variables.

Customize a shirt, check out using Stripe's test card `4242 4242 4242 4242` with any future expiry, any CVC, and a US shipping address. The success page first shows confirmation in progress, then shows when the sandbox print order has been submitted. Prodigi sandbox orders are not printed or shipped.

## Go live

Replace the test Stripe key and webhook secret with live credentials. Register the same webhook URL in Stripe live mode. Set `PRODIGI_API_KEY` to a live Prodigi key and `PRODIGI_API_BASE` to `https://api.prodigi.com`. Verify pricing, shipping costs, sales tax, artwork placement with a physical sample, customer support contact information, refund policy, and operational handling of any order with `needs_review` status before taking real payments.
