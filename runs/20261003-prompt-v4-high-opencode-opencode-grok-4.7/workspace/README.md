# Stillpoint

A custom t-shirt studio. The customer names an hour and a place; the shop charts the stars that were overhead and prints them, direct to garment, only after Stripe confirms payment.

## Stack

- Next.js storefront
- Stripe Checkout (test sandbox)
- Prodigi Print API, Gildan Softstyle 64000 (`GLOBAL-TEE-GIL-64000`)
- Print files are generated on demand as transparent PNGs and fetched by Prodigi

## Local

```bash
npm install
npm run dev
```

Required environment variables: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `PRODIGI_API_KEY`, `TOKEN_SECRET`.
