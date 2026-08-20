1. Built and deployed a responsive timestamp-shirt storefront with live previews, Stripe Checkout, server-generated artwork, and Scalable Press fulfillment.

Deployed URL: https://benchmark-20260820-codex-gpt-56-sol.vercel.app

2. Run locally:

```bash
cp .env.example .env.local
npm install
npm run dev
```

Verify with:

```bash
npm test
STORE_URL=https://benchmark-20260820-codex-gpt-56-sol.vercel.app npm run test:e2e
```

Use Stripe test card `4242 4242 4242 4242`. The complete deployed payment flow was successfully exercised.

3. Before launch:

- Replace sandbox credentials with live keys.
- Claim/upgrade the Stripe sandbox account and register `/api/webhooks/stripe`.
- Resolve Scalable Press’s order-ready quote 500, then confirm real fulfillment and pricing.
- Configure the custom domain, support inbox, policies, and taxes.

4. Current limitations:

- U.S. shipping only.
- Fixed $22.50 price and free shipping.
- Scalable Press currently accepts artwork and quote validation but returns a sandbox 500 when combining the design and address. Paid orders are safely marked for manual review with a persistent design reference.

5. Key decisions:

- Hosted Stripe Checkout minimizes PCI exposure.
- Exact timestamps are frozen before checkout and propagated through Stripe metadata.
- Fulfillment is idempotent and can run from either the success page or webhook.
- SVG/sharp artwork generation keeps print output deterministic and high resolution.
- The visual design preserves the original black-shirt/live-timestamp idea while providing a more polished responsive storefront.

6. Friction encountered:

- Stripe Projects required expired browser authentication.
- The claimable Stripe key cannot create webhook endpoints.
- Scalable Press’s order-ready sandbox quote returned an undocumented 500 despite successful product, artwork, address, and quote-only validation.