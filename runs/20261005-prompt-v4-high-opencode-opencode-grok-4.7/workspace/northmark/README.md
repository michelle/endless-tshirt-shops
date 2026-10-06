# Northmark

A one-off t-shirt studio. Each shirt is a survey plate of a real night sky — place, date, hour, title, and dedication — printed direct-to-garment on a Gildan 2000 and shipped by Prodigi only after Stripe confirms payment.

## Local

```bash
npm install
# copy fonts into ./fonts (see package script notes in the deploy notes)
npm start
```

Environment:

- `STRIPE_SECRET_KEY` — Stripe test secret or claimable sandbox key with Checkout access
- `PRODIGI_API_KEY` — Prodigi sandbox key
- `PRODIGI_API_BASE` — defaults to `https://api.sandbox.prodigi.com`

## Flow

1. The plate is drawn server-side as a transparent 2490×3510 PNG (Prodigi’s front print area).
2. Shipping is quoted from Prodigi before checkout. The customer is charged the retail plate price plus that shipping quote.
3. Stripe Checkout takes payment. The success page and the webhook both call the same idempotent fulfill step.
4. Fulfillment checks `payment_status === paid`, then creates a Prodigi order with `idempotencyKey` set to the Checkout session. Unpaid sessions never create a print order.
