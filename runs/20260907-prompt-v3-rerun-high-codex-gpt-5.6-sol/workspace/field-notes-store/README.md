# Fieldmark

Fieldmark is a personalized t-shirt storefront. A customer supplies a meaningful place, coordinates, date, and dedication; the app generates a deterministic topographic print and shows it live before purchase.

## Commerce flow

1. `POST /api/checkout` validates the design and creates a Stripe-hosted Checkout Session at the server-owned $42 unit price.
2. Stripe collects card, phone, email, and shipping details.
3. `POST /api/stripe/webhook` verifies Stripe's signature and re-fetches the Session. It exits unless `payment_status` is `paid`.
4. The webhook creates a signed, immutable artwork URL and submits the shirt to Prodigi's sandbox with a deterministic idempotency key.
5. `GET /api/artwork` verifies the HMAC signature and renders a transparent 4680 × 5790 PNG for the Bella + Canvas 3001 front print area.

Webhook retries are safe: Prodigi permanently remembers the idempotency key, and the Stripe Session is updated with the Prodigi order ID after acceptance.

## Local setup

Copy `.env.example` to `.env.local`, fill the values, then run:

```bash
npm install
npm run dev
```

For Stripe testing, forward signed events to `http://localhost:3000/api/stripe/webhook` with the Stripe CLI and use Stripe's standard test card `4242 4242 4242 4242`, any future expiry, and any CVC.

## Required environment variables

- `STRIPE_SECRET_KEY`: Stripe test or live secret key.
- `STRIPE_WEBHOOK_SECRET`: signing secret for this deployment's `/api/stripe/webhook` endpoint.
- `PRODIGI_API_KEY`: sandbox key while testing; use a separate live key at launch.
- `ARTWORK_SIGNING_SECRET`: long random secret used to authenticate print assets.
- `PUBLIC_SITE_URL`: optional canonical origin. Request origin is used when omitted.

## Production checklist

- Change the Prodigi base URL in `app/api/stripe/webhook/route.ts` from sandbox to live only after sample-order QA.
- Add Stripe live keys and recreate the webhook in live mode.
- Confirm product margins and destination-specific shipping/tax treatment.
- Add final legal, privacy, returns, support, analytics, and transactional email details.
- Perform a trademark/domain check for the Fieldmark name before launch.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
