# datetime.store

A small storefront for a t-shirt with the current datetime, rebuilt with Next.js, Stripe PaymentIntents, and Prodigi Print API v4 sandbox fulfillment.

## Local development

Copy `.env.example` to `.env.local` and provide:

- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` and `STRIPE_SECRET_KEY` from Stripe test mode
- `PRODIGI_API_KEY` from the Prodigi sandbox
- `STRIPE_WEBHOOK_SECRET` for `/api/webhooks/stripe` when testing webhook fulfillment
- `NEXT_PUBLIC_APP_URL` as the public URL that Prodigi can fetch for artwork

Then run:

```bash
npm install
npm run dev
```

Use Stripe test card `4242 4242 4242 4242`, any future expiry, and any CVC. The app creates a payment intent, verifies it server-side, and submits an idempotent `GLOBAL-TEE-BC-6004` (fitted) or `GLOBAL-TEE-BC-3001` (unisex) order to Prodigi Sandbox. Prodigi only downloads the generated artwork; sandbox orders are not manufactured or shipped.

## Deployment

The project is configured for Vercel. Set the same variables in the Production environment and deploy with `vercel --prod`. Register `POST /api/webhooks/stripe` for `payment_intent.succeeded` so fulfillment recovers even if the customer closes the browser after payment.
