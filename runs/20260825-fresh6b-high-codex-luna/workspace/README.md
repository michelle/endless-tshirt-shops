# datetime.store

An updated rebuild of the original datetime.store experience: a black Bella+Canvas 3001 tee printed with the exact millisecond of purchase.

## Run locally

```bash
npm install
cp .env.example .env.local
# fill in Stripe test keys and a Prodigi sandbox key
npm run dev
```

Open `http://localhost:3000`. Use Stripe’s `4242 4242 4242 4242` test card, any future expiry, and any CVC. The app creates a Stripe PaymentIntent, stores the shipping details and captured timestamp on it, confirms payment with Stripe.js, and submits a sandbox order to Prodigi.

The public artwork route (`/api/artwork`) renders the captured timestamp to a print-ready PNG that Prodigi can fetch. The signed `/api/stripe-webhook` route is included for recovery if a browser closes after payment; configure it before taking real orders.

## Environment

- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`: Stripe test/live publishable key
- `STRIPE_SECRET_KEY`: Stripe test/live secret key
- `STRIPE_WEBHOOK_SECRET`: signing secret for `/api/stripe-webhook`
- `PRODIGI_API_KEY`: Prodigi API key
- `PRODIGI_ENV`: `sandbox` (default behavior) or `live`
- `PUBLIC_URL`: optional canonical HTTPS origin used by webhook fulfillment

The default price is $22.50 with free budget shipping. The fulfillment SKU is Prodigi `GLOBAL-TEE-BC-3001`, black, front print, with sizes S/M/L/XL.
