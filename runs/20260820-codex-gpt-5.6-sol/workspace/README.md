# datetime.store

A production-minded rebuild of the original timestamp shirt: choose a fit and size, freeze the current Unix time, pay through Stripe Checkout, and submit the paid order to Scalable Press.

## Local setup

1. Copy `.env.example` to `.env.local` and supply Stripe test credentials, a one-time USD 2250 Stripe Price, and the Scalable Press test key.
2. Run `npm install && npm run dev`.
3. Open `http://localhost:3000`, select a variant, and use Stripe test card `4242 4242 4242 4242` with any future expiry/CVC and a valid U.S. shipping address.

`SP_FULFILLMENT_MODE=quote` stops after a validated Scalable Press quote. `order` submits the sandbox order. Configure a Stripe webhook for `checkout.session.completed` at `/api/webhooks/stripe`; the success page is also an idempotent fallback trigger.

Run the deployed browser flow with `STORE_URL=https://your-project.vercel.app npm run test:e2e`. It creates a Stripe test payment, a Scalable Press design, and either a sandbox order or a manual-review handoff if Scalable Press returns a 5xx while routing the order-ready quote.
