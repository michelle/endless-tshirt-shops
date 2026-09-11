# Future Fossil Club

Custom DTG t-shirts that turn a buyer's name, place and personal ritual into a one-of-one “future museum exhibit” print.

## Commerce flow

1. The shopper customizes their tee and is sent to Stripe Checkout.
2. Stripe signs `checkout.session.completed` or `checkout.session.async_payment_succeeded` to `/api/stripe-webhook`.
3. Only after a verified successful payment does the webhook submit a print-ready SVG to Prodigi.
4. The Stripe session ID is used as Prodigi's idempotency key, preventing repeat webhook deliveries from producing duplicate orders.

## Required production configuration

Set `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `PRODIGI_API_KEY`, `PRODIGI_SANDBOX=false`, and `NEXT_PUBLIC_APP_URL` in the Vercel project. In Stripe, register `https://your-domain/api/stripe-webhook` for `checkout.session.completed` and `checkout.session.async_payment_succeeded`.

The store currently offers US shipping only and prices the included standard shipping into the $44 tee price. Use a real Prodigi quote workflow before expanding to other countries or changing margins.
