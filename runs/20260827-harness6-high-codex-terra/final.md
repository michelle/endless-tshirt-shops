Built and deployed the datetime.store rebuild:

https://benchmark-20260827-harness6-high-co.vercel.app

It includes a polished live timestamp tee preview, unisex/tailored Bella+Canvas options, Stripe Checkout integration, server-verified Stripe webhook fulfillment, and Prodigi sandbox orders. Artwork is rendered as a 4677×5881 PNG for print. I verified a real Prodigi sandbox order (`ord_1169326`) with no issues. The selected Prodigi products are Bella+Canvas 3001 and 6004. [3001](https://www.prodigi.com/products/mens-clothing/t-shirts/classic/bella-canvas-3001/) · [6004](https://www.prodigi.com/products/womens-clothing/t-shirts/classic/bella-canvas-6004/)

To run locally, see [README.md](/var/folders/mq/v8s9bp2x5gg6gvywwjfszb8r0000gn/T/benchmark-workspace.ZOsQMP/README.md). In short:

```bash
npm install
cp .env.example .env.local
npm run dev
```

Before accepting purchases, add these Vercel Production variables and redeploy:

- `STRIPE_SECRET_KEY` — Stripe test key first, then live key.
- `STRIPE_WEBHOOK_SECRET` — from a Stripe Dashboard webhook pointed at:
  `https://benchmark-20260827-harness6-high-co.vercel.app/api/stripe/webhook`

Then use Stripe test card `4242 4242 4242 4242` in checkout. A successful `checkout.session.completed` event creates an idempotent Prodigi sandbox order. Switch `PRODIGI_API_BASE` to `https://api.prodigi.com/v4.0` and replace the sandbox key with a live key only after testing.

Key decisions: modern Next.js server routes, hosted Stripe Checkout for secure payment/address collection, webhook-only fulfillment after confirmed payment, and Prodigi’s global Bella+Canvas SKUs instead of the original Scalable Press flow.

Known limitations: Stripe credentials were not available in the environment or authenticated Stripe CLI, so I could not activate or personally complete the live Stripe test checkout. The app deliberately displays a clear configuration error until those keys are added. Order-status callbacks are accepted and logged; adding a database and customer tracking page would be the next production-hardening step.

Friction encountered: no usable Stripe connector/browser session or test secret key was exposed, while the Prodigi sandbox key was available and verified successfully.