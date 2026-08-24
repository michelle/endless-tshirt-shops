Built and deployed a polished datetime.store rebuild.

1. Deployed app

[Open the storefront](https://benchmark-20260824-prodigi-high-cod-three.vercel.app/)

Created fresh Vercel project:

`benchmark-20260824-prodigi-high-codex-gpt-5.6-luna`

Implemented:

- Live millisecond timestamp preview on a black tee
- Fitted/unisex cuts and S–XL sizes
- Responsive editorial storefront design
- Stripe Payment Element with test-mode PaymentIntents
- Prodigi sandbox fulfillment using public PNG artwork URLs
- Idempotent fulfillment keyed to the Stripe PaymentIntent
- Prodigi callback endpoint
- Free-shipping messaging and confirmation state

2. Run and verify

```bash
npm install
npm run dev
```

For the complete local app including serverless API routes:

```bash
vercel dev
```

Production verification:

- Use test card `4242 4242 4242 4242`
- Any future expiration date
- Any CVC and ZIP
- Submit an order and verify the success screen
- Confirm the resulting order in Prodigi Sandbox

Verified live:

- Stripe PaymentIntent succeeded for `$22.50`
- Prodigi accepted order `ord_1168693`
- Prodigi reported zero issues
- Artwork was fetched from the deployed HTTPS endpoint
- Retrying fulfillment returned the same order without duplication

3. Steps before real customers

- Replace the temporary Stripe sandbox keys with permanent live Stripe keys.
- Replace `PRODIGI_API_KEY` with a live Prodigi key and set `PRODIGI_ENV=live`.
- Claim or replace the temporary Stripe sandbox, which expires August 31, 2026.
- Configure a production domain and customer-support email.
- Configure Prodigi callbacks/webhook processing with durable order storage.
- Add tax calculation, regional shipping rules, refund handling, and order reconciliation.

4. Known limitations

- Currently configured for US shipping.
- Price is fixed at `$22.50`; no tax is calculated.
- Prodigi callback events are logged but not persisted.
- If payment succeeds while Prodigi is unavailable, the order requires retry/reconciliation.
- The Stripe sandbox key is temporary.
- Local `npm run dev` serves only the frontend; use `vercel dev` for API routes.

5. Key decisions

- Used React/Vite with Vercel serverless functions for a lightweight deployment.
- Used Stripe PaymentIntents instead of the reference’s legacy token/charge flow.
- Generated timestamp artwork as PNG because Prodigi requires remotely fetchable image assets.
- Used Prodigi SKUs `GLOBAL-TEE-BC-3001` and `GLOBAL-TEE-GIL-64000`.
- Added Stripe/Prodigi idempotency protection to prevent duplicate fulfillment.
- Preserved the original product concept while upgrading the visual system and checkout UX.

6. Friction encountered

- Vercel preview URLs were deployment-protected, so I promoted the final deployment to a public production alias.
- Stripe initially rejected server-side confirmation because redirect payment methods were enabled; this was fixed with `allow_redirects: 'never'`.
- An older temporary Stripe PaymentIntent disappeared from the sandbox during retry testing, so I reran a fresh full transaction successfully.