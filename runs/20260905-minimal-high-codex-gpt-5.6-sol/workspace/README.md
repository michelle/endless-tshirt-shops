# datetime.store

A production-oriented rebuild of [datetime.store](https://github.com/michelle/datetime.store).
Customers choose a fit and size, freeze the current Unix timestamp in milliseconds,
pay in Stripe Checkout, and create an idempotent print-on-demand order in Prodigi.

## Local setup

1. Copy `.env.example` to `.env.local` and fill in the test credentials.
2. Run `npm install`.
3. Run `npm run dev`.
4. Forward Stripe events to `http://localhost:3000/api/webhooks/stripe` and set
   the printed signing secret as `STRIPE_WEBHOOK_SECRET`.

Use Stripe's standard test card `4242 4242 4242 4242`, any future expiry,
and any CVC.

## Order flow

- `POST /api/checkout` validates the selected shirt and creates Stripe Checkout.
- Stripe collects payment, email, phone, and the shipping address.
- The signed webhook submits the order to Prodigi with the Checkout Session ID
  as an idempotency key.
- `GET /api/artwork` renders a signed, immutable, print-ready transparent PNG.
- The success page verifies payment and safely retries fulfillment if necessary.

Prodigi defaults to its sandbox base URL. Set `PRODIGI_BASE_URL=https://api.prodigi.com/v4.0`
only after live product, shipping, tax, and artwork tests are complete.
