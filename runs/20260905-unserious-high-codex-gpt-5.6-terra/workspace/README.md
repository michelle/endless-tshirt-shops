# datetime.store

A deliberately serious storefront for one deliberately silly product: a black t-shirt stamped with the exact timestamp at checkout.

## How it works

1. The browser renders the changing timestamp on the product preview.
2. Checkout locks the timestamp in Stripe Checkout metadata.
3. Stripe's signed `checkout.session.completed` webhook sends a one-off order to Prodigi.
4. Prodigi downloads a print-ready PNG from `/api/print-art` and processes the order idempotently.

The deployed configuration uses Stripe test mode and the Prodigi sandbox, so test purchases cannot charge or fulfill anything.

## Local setup

Copy `.env.example` to `.env.local`, fill in the values, then run:

```bash
npm install
npm run dev
```

For a real launch, use a Stripe live secret + production webhook signing secret, a live Prodigi key, and set `PRODIGI_API_BASE=https://api.prodigi.com/v4.0`. Keep a Prodigi pause window enabled until you have verified real pricing, shipping, and the garment configuration.

## Fulfillment notes

The order adapter uses Prodigi's `TEE-AS-5001` black tee with the selected size and its `front` print area. It uses Stripe's Checkout shipping address, a unique `idempotencyKey` based on the Checkout Session, and the public, timestamp-specific PNG. Prodigi test orders can be found in the Sandbox dashboard.
