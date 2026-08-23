## Built and deployed

[datetime.store sandbox](https://benchmark-20260823-serial-high-code-virid.vercel.app)

A responsive timestamp-shirt storefront with:

- Live millisecond preview and fitted/unisex, S–XL selection
- Stripe hosted Checkout with free US shipping
- Signed Stripe webhook plus return-page fallback
- Scalable Press design, quote, and order fulfillment
- Privacy/terms pages, health endpoint, security headers
- Deterministic print-ready artwork matching the preview

Verified with a real Stripe sandbox payment and Scalable Press test order `6a8b5c460716651bd67f7a5a`; its artwork proof was visually inspected.

## Run and verify

See [README.md](/var/folders/wd/gw90z80s6xlc536l4gbc24v00000gn/T/benchmark-workspace.tdrjew/README.md).

```bash
npm install
cp .env.example .env.local
npm run dev

npm test
npm run typecheck
npm run build
```

Use Stripe test card `4242 4242 4242 4242`, any future expiry/CVC, and a valid US address. `/api/health` reports integration readiness.

## Before accepting real customers

- Claim the temporary Stripe sandbox before August 30: [claim sandbox](https://dashboard.stripe.com/onboard_sandbox/YWNjdF8xVTdaQUQ3aG91UThnNVNBLDE3ODgxMjEzNTMv100KWICM2cT).
- Replace Stripe and Scalable Press test credentials with live credentials.
- Register the live Stripe webhook and update `STRIPE_WEBHOOK_SECRET`.
- Confirm Scalable Press billing, inventory, samples, and live ordering before enabling `SP_PLACE_ORDERS=true`.
- Configure a custom domain, working support email, taxes, legal business details, and final return policy.
- Recheck unit economics; the verified test fulfillment quote was $15.42 before Stripe fees.

## Limitations and assumptions

- US shipping only; black shirts, S–XL.
- No customer tracking portal or operations dashboard.
- PaymentIntent metadata provides basic idempotency; higher volume should add a durable queue/database.
- The original fitted blank now produces Scalable Press quote errors, so an available comparable fitted cotton blank is used.

## Decisions

I used hosted Stripe Checkout to minimize PCI scope, webhook-first fulfillment for reliability, and deterministic vector glyphs so artwork does not depend on Vercel fonts. The visual direction keeps the original live-timestamp concept but gives it a modern editorial storefront.

## Friction

Stripe Projects initialization required browser authentication, so I provisioned the working temporary Stripe sandbox directly through Stripe CLI instead. Scalable Press returned opaque errors for the original fitted blank and its legacy multipart parser needed explicit encoding. Print-proof inspection also caught missing server fonts, prompting the deterministic vector artwork implementation.