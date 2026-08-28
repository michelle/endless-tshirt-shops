# datetime.store

A production-ready rebuild of the original one-product shop: a timestamp is frozen at checkout and direct-to-garment printed by Prodigi onto a black Bella+Canvas 3001 tee.

## Local setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

To test Stripe webhooks locally, forward `checkout.session.completed` to `/api/stripe/webhook` with the Stripe CLI and copy the returned `whsec_...` into `.env.local`.

## Architecture

- Stripe Checkout collects payment, email, and shipping details.
- The webhook verifies Stripe's signature, then creates an idempotent Prodigi order.
- `/api/artwork` renders the frozen timestamp to a 4677px PNG that Prodigi can download securely from the deployed app.
- The app defaults to Prodigi sandbox when `PRODIGI_API_BASE` is unset; set it to `https://api.prodigi.com/v4.0` only after production verification.

The configured garments are `GLOBAL-TEE-BC-3001` (unisex) and `GLOBAL-TEE-BC-6004` (tailored), black, with the chosen lowercase size.
