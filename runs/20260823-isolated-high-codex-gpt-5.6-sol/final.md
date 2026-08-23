## 1. Built and deployed

Production-oriented timestamp T-shirt storefront with:

- Live millisecond artwork preview
- Fitted/unisex cuts and sizing
- Stripe-hosted test checkout
- Signed Stripe webhooks
- Server-rendered print-ready PNG artwork
- Scalable Press design and quote integration
- Responsive, accessible UI and security headers

Deployed sandbox: https://benchmark-20260823-isolated-high-co.vercel.app

## 2. Run and verify

See [README.md](/var/folders/wd/gw90z80s6xlc536l4gbc24v00000gn/T/benchmark-workspace.OZGpaH/README.md:1).

```bash
npm install
cp .env.example .env.local
npm run dev
npm test
```

Use Stripe test card `4242 4242 4242 4242`, any future expiry/CVC, and a U.S. address.

Verified:

- Lint, unit tests, TypeScript, and production build
- Real Stripe test PaymentIntent for $22.50
- Signed deployed webhook
- Scalable Press artwork generation and order-ready quote
- No real payment or physical order

## 3. Before accepting customers

- Claim or replace the temporary Stripe sandbox before August 29, 2026.
- Configure live Stripe keys and recreate the webhook in live mode.
- Add a production Scalable Press key, billing, and approved sample prints.
- Validate margins—$22.50 may not cover printing, shipping, Stripe fees, refunds, and tax.
- Add legal, privacy, returns, support, tax, monitoring, and transactional-email operations.
- Add a durable order database/queue before setting `FULFILLMENT_MODE=live`.
- Upgrade to a patched Next.js release once the registry safety window permits.

## 4. Limitations

- Fulfillment intentionally remains `quote`; no physical orders are placed.
- U.S. shipping only.
- Fulfillment idempotency uses Stripe metadata, not an atomic database ledger.
- Production audit currently reports two high and one moderate transitive advisory; patched releases were blocked by the environment’s 30-day package-age policy.

## 5. Key decisions

I retained the original stark, single-product concept while modernizing payments, validation, accessibility, mobile behavior, artwork quality, webhook handling, and fulfillment safety. Stripe Checkout minimizes PCI scope; server-side pricing and artwork prevent client tampering.

## 6. Friction

Stripe Projects initialization requires claiming the supplied sandbox in a browser, so the isolated Stripe test account was used directly. Headless browsers were killed by the execution environment, so hosted checkout availability was verified over HTTP and the complete backend chain was verified using Stripe’s test API and a correctly signed completion event.