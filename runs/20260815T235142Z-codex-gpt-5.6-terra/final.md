Built and deployed a polished rebuild of datetime.store:

https://benchmark-20260815t235142z-codex-gpt-56-terra-al1atm70i.vercel.app

It recreates the live millisecond timestamp shirt, fitted/unisex and size choices, email capture, responsive styling, and a Stripe-hosted $22.50 checkout.

Verification:

- `npm run build` passes.
- Deployed storefront returns HTTP 200.
- Deployed `/api/checkout` successfully creates Stripe sandbox Checkout Sessions.
- Scalable Press credentials were authenticated against its catalog.
- Invalid checkout input correctly returns validation errors.

Run locally:

```bash
npm install
STRIPE_SECRET_KEY=... SP_AUTH=... npm run dev
```

Use Stripe test card `4242 4242 4242 4242`, any future expiry/CVC, and a US shipping address.

Key decisions:

- Used hosted Stripe Checkout so payment details never touch the app.
- Generated fulfillment artwork server-side as a PNG containing the captured timestamp.
- Added Scalable Press design → quote → order integration, plus provider-backed fulfillment order metadata to reduce duplicate submissions.
- Set deployed `FULFILLMENT_MODE=dry_run` so Stripe test purchases cannot accidentally trigger a physical shirt order.

Before launch:

- Change `FULFILLMENT_MODE` to live.
- Replace the temporary Stripe sandbox key (it expires soon) with production credentials.
- Add a signed Stripe webhook and durable order store for robust retry/concurrency handling.
- Decide whether shipping should be included in the $22.50 price or calculated as a Stripe shipping rate; the current checkout collects shipping address but preserves the reference product’s fixed price.

Friction encountered: the supplied Vercel project name contained uppercase characters, which Vercel rejects, so I created the required new run-specific project using its lowercase equivalent. The account also enabled deployment protection by default; I disabled it for this new project so the URL is publicly reachable.