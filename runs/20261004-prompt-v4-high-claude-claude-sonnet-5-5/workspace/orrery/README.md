# Orrery: a tee printed with the sky on any date

Customers pick a date (1800 to 2050), a name, and a dedication line. The shirt prints the solar system as arranged on that day, with the real moon phase and a star field unique to the order. Each shirt is printed on demand via Prodigi (DTG).

## Run locally

```sh
npm install
export PRODIGI_API_KEY=...        # sandbox key
export DEMO_PAYMENTS=1            # no real payments; sandbox only
export ADMIN_TOKEN=pick-a-password
npm start                         # http://localhost:3000
npm test
```

Prodigi must be able to download the print files, so `BASE_URL` has to be publicly reachable for fulfilment to succeed (use a tunnel when developing locally).

## How an order flows

1. Browser builds a cart; `/api/quote` prices shipping with Prodigi `/quotes`.
2. `/api/checkout` stores an order (`pending_payment`) and creates a Stripe Checkout session (or the demo payment page).
3. The only path to `paid` is the signed Stripe webhook (`/api/stripe/webhook`) or the reconcile poller that re-reads the session from Stripe. Amount, currency, and session reference are verified.
4. Only after `paid` is the 4665x5844 transparent 300dpi print PNG rendered and the Prodigi order created (`idempotencyKey` and `merchantReference` equal the order id, with lookup before any retry so duplicates can't happen).
5. Failures retry with exponential backoff (8 attempts); then the order shows in `/admin` as `fulfillment_failed` with a Retry button.

Print files are served at `/print/:id/:n.png?t=<order token>` and only for paid orders.

## Configuration

See `.env.example`. The server refuses to start on unsafe combinations (demo payments with a Stripe key, demo payments against the production Prodigi API, Stripe without a webhook secret).

## Going to production

1. Create a Stripe account, set `STRIPE_SECRET_KEY` (live) and add a webhook endpoint `BASE_URL/api/stripe/webhook` for `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`. Put its signing secret in `STRIPE_WEBHOOK_SECRET`. Remove `DEMO_PAYMENTS`.
2. Create a Prodigi production account, add billing, set the live `PRODIGI_API_KEY` and `PRODIGI_BASE_URL=https://api.prodigi.com/v4.0`.
3. Deploy on a host with a persistent disk (`Dockerfile`, `render.yaml`, `fly.toml` included; untested here) and a stable domain. Mount the disk at `DATA_DIR`.
4. Set a strong `ADMIN_TOKEN`; set `BASE_URL` to the final https URL.
5. Order one real shirt to yourself and inspect it before launch.
6. Add Terms, Privacy, and Refund/Returns pages (none exist yet; made-to-order items usually can't be returned except for defects) and set your own prices (`src/catalog.js`; check margin against Prodigi's quote for your destinations).
