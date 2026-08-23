Built and deployed a polished datetime.store rebuild:

https://benchmark-20260823-isolated-high-co-omega.vercel.app

It preserves the core experience: a live Unix-millisecond timestamp on a black tee, fitted/unisex and size selection, $22.50 checkout, and free U.S. shipping.

Implemented:

- Stripe-hosted test checkout
- Server-side Scalable Press fulfillment: PNG artwork → design → quote → order
- Stripe webhook endpoint for reliable post-payment fulfillment
- Responsive, production-oriented storefront and security headers

Verified:

- Deployed storefront: HTTP 200
- Hosted Stripe Checkout creation works
- Stripe $22.50 test-card payment succeeded
- Scalable Press test mode completed a design, quote, and sandbox order
- All local tests pass (`npm test`)

To run locally: set `STRIPE_SECRET_KEY` and `SP_AUTH`, then run `npm run dev`.

Before accepting real customers:

1. Replace the current Stripe test restricted key and Scalable Press test key with live credentials in Vercel.
2. Create a Stripe `checkout.session.completed` webhook pointing to `/api/webhook`, then set `STRIPE_WEBHOOK_SECRET` in Vercel.
3. Confirm live Scalable Press pricing/shipping and choose a distinct fitted SKU if desired.

Known limitations: the verified Scalable Press fitted SKU failed its quote endpoint in the sandbox, so both presentation styles currently fulfill with the verified Next Level Fitted Crew SKU. The visual style choices remain intact.

I used the Stripe Projects CLI, but its sandbox account requires a browser-based claim before it can initialize a full Stripe Project; I proceeded with the available test credentials.