# Signal / Self

A personalized DTG t-shirt storefront. Customers compose a short “signal,” add a meaningful date or location, choose a color mood, shirt color, size, and quantity, then pay through Stripe Checkout. A signed Stripe webhook is the only path that submits an order to Prodigi.

## Order safety

- Checkout inputs are validated again on the server.
- Stripe webhook signatures are required.
- Fulfillment retrieves the Checkout Session and requires `payment_status === "paid"`.
- Prodigi receives the Stripe Checkout Session ID as its idempotency key, preventing duplicate print orders during webhook retries.
- The generated print-art URL is signed and tamper-resistant.
- Prodigi defaults to its sandbox API.

## Local setup

Copy `.env.example` to `.env.local`, add Stripe test credentials, and run `npm run dev`.

Create a Stripe webhook for `checkout.session.completed` and `checkout.session.async_payment_succeeded` pointing to `/api/webhooks/stripe`. For local testing, Stripe CLI can forward events to that route.

## Test checkout

With Stripe test keys configured, customize a shirt and check out. Use Stripe test card `4242 4242 4242 4242`, any future expiration date, any CVC, and one of the supported shipping countries. A successful test payment should create exactly one order in the Prodigi sandbox dashboard.

## Production switch

Use Stripe live keys and a live webhook secret. Replace the Prodigi sandbox key with a live key and set `PRODIGI_API_BASE_URL=https://api.prodigi.com/v4.0`. Before doing that, configure a Prodigi pause window, test physical samples, confirm price/tax/shipping rules, add real support and legal pages, and review orders manually during launch.
