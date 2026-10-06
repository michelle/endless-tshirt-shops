# Vesper

A direct-to-garment t-shirt of one real night sky. The customer names a date, a place, and who was there. The store charts the stars above that horizon and prints them on a Gildan Softstyle 64000. Prodigi receives the order only after Stripe reports the payment as paid.

## Sandbox

This deployment uses the Prodigi sandbox and a Stripe test sandbox. Test card: `4242 4242 4242 4242`, any future expiry, any CVC, any postal code. No real charge, and no shirt is produced.

## Local

```bash
cp .env.example .env.local
# fill in Stripe test keys, Prodigi key, and ART_SECRET
npm install
npm run dev
```

Checkout return URLs and the print-file URL need a public HTTPS origin. Use the deployed site for a full payment-to-print test. `npm run proof` writes shirt and print previews to `proof/`.
