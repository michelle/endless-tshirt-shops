# datetime.store rebuild

A production-oriented Next.js storefront inspired by the original datetime.store: the current Unix timestamp is printed on a black shirt and locked at checkout.

## Local setup

1. Copy `.env.example` to `.env.local` and add Stripe sandbox credentials plus `SP_AUTH`.
2. `npm install && npm run dev`
3. Open `http://localhost:3000`, choose a shirt, and pay in Stripe Checkout with `4242 4242 4242 4242`, any future expiry, any CVC, and any US ZIP.
4. Forward Stripe webhooks for local fulfillment testing: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`, then set the emitted `whsec_…` value in `.env.local`.

The deployment intentionally defaults to `FULFILLMENT_MODE=dry_run`: successful paid test checkouts exercise the Stripe workflow without creating a physical print order. Change that setting to `live` only after completing the Scalable Press production onboarding and approving a sample.

Fulfillment uploads a high-resolution SVG with the locked timestamp as the front artwork. SVG keeps the digits sharp at print size without adding a native image-processing dependency to the serverless app.
