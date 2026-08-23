Built and deployed `datetime.store` as a fresh Vercel project:

https://benchmark-20260823-serial-high-code-three.vercel.app

Implemented:

- Live timestamp shirt preview
- Fitted/unisex and S–XL options
- Stripe-hosted $22.50 Checkout
- Scalable Press design creation
- Stripe webhook and paid-session fulfillment fallback
- Responsive production-style visual design
- Secure server-side API credentials

Run locally:

```sh
npm install
vercel dev
```

Configure `STRIPE_SECRET_KEY`, `SP_AUTH`, and `PUBLIC_SITE_URL`. Use Stripe test card `4242 4242 4242 4242`.

Before real customers:

- Replace the temporary Stripe sandbox key, which expires 2026-08-30.
- Register `/api/stripe-webhook` in Stripe and set `STRIPE_WEBHOOK_SECRET`.
- Resolve Scalable Press’s current test quote failure and verify product availability/pricing.
- Add persistent order storage, retries, rate limiting, policies, and support contact details.

Known limitations:

- Stripe Projects authentication required browser login and was unavailable; a temporary Stripe sandbox was provisioned instead.
- Scalable Press design creation works, but its test API currently returns a generic HTTP 500 when quoting a newly created design.
- Fulfillment state is stored in Stripe Session metadata; a database/queue is recommended for production volume.

Friction encountered included Vercel rejecting an unnecessary runtime declaration, Vercel deployment protection on generated URLs, and undocumented Scalable Press form-encoding requirements.