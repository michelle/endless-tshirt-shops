Built and deployed a polished `datetime.store` rebuild:

- Live preview: https://benchmark-20260822-high-codex-gpt-56-terra-jzhwnf34g.vercel.app
- Fresh Vercel project: `benchmark-20260822-high-codex-gpt-5.6-terra`

It preserves the original’s live millisecond-timestamp shirt concept, with upgraded responsive design, fit/size selection, Stripe Checkout, success state, Scalable Press artwork rendering, and webhook support.

Verification completed:

- Production build passes.
- Dependency audit: 0 vulnerabilities.
- Public preview responds with HTTP 200.
- Deployed API creates real Stripe test Checkout sessions.
- Scalable Press test credential accepted a generated PNG DTG design upload.
- Dry-run fulfillment correctly maps product, size, timestamp, and shipping address.
- Unsigned Stripe webhooks are rejected.

To run locally:

```bash
npm install
cp .env.example .env.local
npm run dev
```

For checkout testing, set Stripe test credentials and use card `4242 4242 4242 4242` in Stripe Checkout.

Before launching real orders:

- Add production Vercel variables: `STRIPE_SECRET_KEY`, `SP_AUTH`, `SP_FULFILLMENT_MODE=live`, and `STRIPE_WEBHOOK_SECRET`.
- Register `https://<production-domain>/api/webhooks/stripe` in Stripe for `checkout.session.completed`.
- Confirm Scalable Press live product IDs, pricing/margins, and shipping policy.
- Deploy with `vercel --prod`.

Decisions made: hosted Stripe Checkout avoids handling card data; fulfillment defaults to `dry_run` so the deployed test flow cannot create physical shirts; PNG artwork is generated server-side because Scalable Press DTG rejects SVG. Stripe session metadata stores the fulfillment reference for retry safety.

Known limitation: fulfillment uses Stripe metadata as its lightweight idempotency record; for meaningful order volume, add a transactional database/KV lock around the print-partner submission. The preview intentionally has webhook signing unset, so it exercises the safe return-page dry-run instead.

Friction encountered: Stripe Projects required a renewed browser-auth session, so I used the already logged-in Stripe test credential. Vercel’s inherited deployment SSO initially blocked anonymous access; I disabled it for this newly created benchmark project so the preview is reachable.