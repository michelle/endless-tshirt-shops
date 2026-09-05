## 1. Built and deployed

A production-minded rebuild of [datetime.store](https://github.com/michelle/datetime.store), preserving its core experience:

- Live Unix-millisecond timestamp rendered on a black shirt
- Timestamp freezes when checkout begins
- Responsive, polished storefront with six sizes
- Stripe-hosted test checkout at $24, including US shipping
- Signed Stripe webhook fulfillment
- Dynamic 4680×5790 transparent print artwork
- Prodigi sandbox fulfillment using `GLOBAL-TEE-BC-3001`
- Idempotent fulfillment from both webhook and success page
- Health checks, metadata, responsive states, error handling, and generated social artwork

**Deployed URL:** https://benchmark-20260904-harness7-high-co-rouge.vercel.app

New Vercel project: `benchmark-20260904-harness7-high-codex-sol`

The health endpoint reports Stripe, webhook signing, Prodigi sandbox, and product availability as operational.

## 2. Run and verify

Local instructions are in [README.md](</var/folders/mq/v8s9bp2x5gg6gvywwjfszb8r0000gn/T/benchmark-workspace.wXOK9X/README.md>).

```bash
npm ci
cp .env.example .env.local
# Add the documented test/sandbox credentials
npm run dev
```

Verification:

```bash
npm test
npm run lint
npm run build
```

All currently pass. Production dependencies report zero known vulnerabilities.

To test checkout, select a size, freeze the timestamp, and use Stripe test card `4242 4242 4242 4242` with any future expiry and valid US test address.

I also verified a real Stripe test Checkout session, signed webhook processing, and creation of exactly one Prodigi sandbox order. Prodigi idempotency prevented duplicate fulfillment during replay. The implementation follows Stripe’s recommended [webhook-based Checkout fulfillment](https://docs.stripe.com/checkout/fulfillment).

## 3. Steps before accepting real customers

1. Claim the temporary Stripe sandbox with `stripe sandbox claim`, finish `stripe projects init`, and configure a permanent Stripe project.
2. Replace the test key with a live Stripe key and register the production webhook events:
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
3. Replace the Prodigi sandbox key and API base URL with live credentials. Prodigi’s [API reference](https://www.prodigi.com/print-api/docs/reference/) documents the production endpoint and order lifecycle.
4. Set a custom domain, update `SITE_URL`, and recreate the Stripe webhook against that domain.
5. Configure sales tax, receipts, refunds, support contact, privacy policy, and returns terms.
6. Order and inspect a physical sample of the selected [Bella+Canvas 3001 shirt](https://www.prodigi.com/products/mens-clothing/t-shirts/classic/bella-canvas-3001/) before launch.
7. Revisit pricing. The tested US sandbox quote was approximately $16.90 before Stripe fees and taxes, leaving a modest margin at $24.

## 4. Known limitations

- The deployed environment uses Stripe test mode and Prodigi sandbox; nothing is charged, printed, or shipped.
- Checkout is currently US-only, quantity one, black, and one unisex shirt model.
- There is no internal order database or merchant dashboard; operational records live in Stripe and Prodigi.
- Fulfillment currently waits for Prodigi inside the webhook request. Idempotency and the success-page fallback make it safe, but a durable queue and alerting system would be preferable at volume.
- Full visual browser automation was unavailable in this environment. Responsive source review, builds, API smoke tests, image inspection, and server-to-server integration tests were completed instead.

## 5. Key decisions

- Used Stripe-hosted Checkout to minimize payment and PCI surface area.
- Combined signed webhooks with success-page fulfillment for reliability.
- Generate artwork on demand from the frozen timestamp, avoiding asset storage.
- Selected Prodigi’s broadly available Bella+Canvas 3001 and restricted launch scope to US delivery.
- Included shipping in one simple displayed price to retain the original product’s directness.
- Modernized the visual presentation while preserving the live-clock/shirt interaction.
- Generated [public/og.png](</var/folders/mq/v8s9bp2x5gg6gvywwjfszb8r0000gn/T/benchmark-workspace.wXOK9X/public/og.png>) with built-in ImageGen. The prompt requested a cream editorial product card with a black timestamp shirt, cobalt accents, and the exact datetime.store tagline.

## 6. Friction encountered

- Stripe Projects initialization reached a browser-only claim/authentication step that could not be completed in the headless environment. The CLI was installed and preflighted; a claimable Stripe sandbox was created and used successfully.
- The in-app browser had no available browser instance, preventing automated click-through screenshots.
- Vercel warns that `--name` is deprecated, but it honored the explicitly supplied project name and created a new project as required.
- An initial high-resolution artwork implementation exceeded Sharp’s pixel limit; it was corrected and the deployed endpoint now returns the intended 4680×5790 RGBA PNG.