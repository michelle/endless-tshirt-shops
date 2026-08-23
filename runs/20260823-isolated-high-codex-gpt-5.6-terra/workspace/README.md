# datetime.store

An intentionally tiny shop that prints the checkout moment on a black t-shirt.

## Local run

Set `STRIPE_SECRET_KEY` and `SP_AUTH`, then run `npm run dev` and visit the local URL. The checkout endpoint creates a Stripe Checkout Session in the matching Stripe mode.

## Fulfillment

`/api/fulfill` is invoked after the hosted Checkout success page loads. `/api/webhook` supports reliable server-side fulfillment for `checkout.session.completed`; set `STRIPE_WEBHOOK_SECRET` after creating a Stripe webhook endpoint. The fulfillment request creates a Scalable Press DTG design, quotes it with the chosen style/size/address, and submits the order after payment has completed.

Never put `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, or `SP_AUTH` in browser code.
