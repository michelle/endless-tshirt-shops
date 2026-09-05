# datetime.store

A deployable rebuild of https://github.com/michelle/datetime.store: capture a live Unix timestamp, buy a black tee, and send the exact artwork to Prodigi.

**Deployed sandbox:** https://benchmark-20260904-harness7-high-co-amber.vercel.app

- Next.js App Router, React, TypeScript, responsive custom CSS.
- Live preview, unisex/fitted sizing, captured-moment review, policies and private order-status page.
- Stripe hosted test checkout and signed webhooks.
- Prodigi product quotes, generated transparent PNGs, sandbox print orders and stable idempotency keys.
- Server validation of product, price, mode, payment and shipping.

## Run

```sh
npm ci
# Configure .env.local from .env.example if this is a fresh checkout.
npm run dev
```

Open http://localhost:3000. Full deployed test instructions, environment setup, retries and the real-customer launch checklist are in [docs/OPERATIONS.md](docs/OPERATIONS.md).

```sh
npm test
npm run build
```

A completed browser test paid $36 in Stripe test mode and automatically submitted Prodigi order `ord_1170396`. Two signed webhook replays and a direct Prodigi replay preserved that same order ID. The provider returned `AlreadyExists` for the direct replay. Prodigi downloaded the artwork and prepared the print-ready asset, then entered sandbox production simulation with no issues. No real charge or manufacturing was requested.

Test card: **4242 4242 4242 4242**, future expiry, any CVC, fictional US address.

## Important remaining setup

The claimable Stripe sandbox expires **September 12, 2026**, unless claimed. Claim details are in the ignored local `docs/stripe-sandbox.json` file. **Stripe Projects initialization is still blocked on account authentication**; a working Stripe test sandbox does not grant Projects authorization.

The app intentionally runs in sandbox mode. Finish the explicit live-launch steps in OPERATIONS.md before changing credentials or enabling real orders.

See [docs/DECISIONS.md](docs/DECISIONS.md) for design decisions, source/asset provenance, technical tradeoffs and friction. Local test evidence and screenshots are in ignored `docs/verification.json` and `artifacts/`.
