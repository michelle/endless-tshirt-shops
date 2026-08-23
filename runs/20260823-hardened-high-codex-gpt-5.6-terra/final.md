Built and deployed a polished datetime.store rebuild:

https://benchmark-20260823-hardened-high-co.vercel.app

It preserves the original’s core idea: a live Unix timestamp on a black shirt, locked at checkout, with fitted/unisex styles, sizes, $22.50 pricing, and free US shipping.

- Stripe sandbox Checkout is live and verified.
- Signed Stripe webhooks are configured and verified.
- Scalable Press fulfillment is integrated through the webhook, currently in safe `dry_run` mode.
- Production build passes.

To run locally:

```bash
npm install
cp .env.example .env.local
npm run dev
```

Then open `http://localhost:3000`. Use Stripe’s test card `4242 4242 4242 4242`, any future date/CVC/US ZIP. See [README.md](/private/var/folders/wd/gw90z80s6xlc536l4gbc24v00000gn/T/benchmark-workspace.hgCT6n/README.md).

Before real customers:

- Claim the temporary Stripe sandbox by August 30, 2026, then replace sandbox keys with your live Stripe keys.
- Register the production Stripe webhook and set its signing secret in Vercel.
- Confirm Scalable Press’s current catalog/product IDs, print artwork requirements, and order pricing; approve a sample.
- Set `FULFILLMENT_MODE=live` only after that validation.
- Add durable order storage/idempotency before handling real volume, so webhook retries cannot create duplicate print orders.

Assumptions/limitations: fulfillment intentionally does not create real physical orders in this deployment; it is sandbox-tested end-to-end through a dry-run. The Scalable Press handoff uses high-resolution SVG artwork for crisp timestamps.

Key decisions: modern Next.js/Vercel server routes keep payment and fulfillment credentials server-side; Stripe Checkout handles shipping/payment securely; the timestamp is passed in checkout metadata and rendered into fulfillment artwork only after payment.

Friction encountered: Stripe Projects required an interactive Stripe login despite the sandbox, so I used the Stripe sandbox CLI directly. I also replaced a native image-rendering dependency after Vercel rejected its binary in serverless; SVG removes that deployment risk. `npm audit` still reports transitive Next.js dependency advisories for versions unavailable in this benchmark registry, so update Next.js to the latest patched release when the registry permits it.