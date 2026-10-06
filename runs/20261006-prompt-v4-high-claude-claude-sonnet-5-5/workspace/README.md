# Asterism

Personalised constellation t-shirts. A customer's name (one star per letter), date, place and words are turned into a unique, seeded constellation; the print-ready 300 dpi PNG is generated on the server and sent to Prodigi (DTG, Bella+Canvas 3001) only after payment succeeds.

## Run locally
    npm install
    PRODIGI_API_KEY=... npm start        # http://localhost:3000, demo payments, Prodigi sandbox
    npm test

## Payments
- No `STRIPE_SECRET_KEY`: built-in **test-mode** payment page (cards 4242… succeeds, 4000 0000 0000 0002 declines). Refused when `PRODIGI_ENV=live`.
- With `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET`: Stripe Checkout. Add a webhook endpoint `https://<host>/api/webhooks/stripe` for `checkout.session.completed` and `checkout.session.async_payment_succeeded`. Fulfilment runs only when Stripe reports `payment_status=paid` and the amount/currency match the signed order; the return page also verifies the session with Stripe. Fulfilment is idempotent (Prodigi `merchantReference` lookup).

## Architecture
Stateless: the order is an HMAC-signed token (48h) carried through the payment provider's metadata; prices are always recomputed server-side. Print files are served from `/print/<signed token>.png`, which Prodigi downloads. Hosts must be reachable from the internet over https and have enough memory for `sharp` (~512 MB).

## Config
See `.env.example`. Prices/shipping: `src/catalog.js`.
