Built and deployed a production-oriented datetime.store rebuild:

**URL:** https://benchmark-20260824-prodigi-high-cod-six.vercel.app
**Vercel project:** `benchmark-20260824-prodigi-high-codex-gpt-5.6-sol`

1. What’s included

- Responsive, polished live timestamp shirt customizer
- Fitted/unisex Bella + Canvas shirts, S–XL
- Stripe hosted sandbox checkout
- Signed 4680×5790 transparent print artwork
- Stripe webhook-driven Prodigi sandbox fulfillment
- Idempotent fulfillment and success-page recovery
- Verified deployed order: `ord_1168685`

2. Run and verify

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Use Stripe card `4242 4242 4242 4242`, any future expiry/CVC, and a valid US address.

Checks completed:

```bash
npm test       # 5 passing
npm run lint
npm run build
npm audit      # 0 vulnerabilities
```

Full instructions are in [README.md](/var/folders/wd/gw90z80s6xlc536l4gbc24v00000gn/T/benchmark-workspace.rVk0V8/README.md).

3. Before real customers

- Run `stripe sandbox claim` before August 31, 2026.
- Authenticate Stripe Projects and run `stripe projects init datetime-store`.
- Replace Stripe sandbox credentials and register a live webhook for both configured Checkout events.
- Replace the Prodigi sandbox key/base URL with live credentials.
- Place a physical sample order to verify artwork placement and print quality.
- Review pricing: current estimated pre-tax cost is $18.41 fitted and $17.05 unisex against a $22.50 sale price.
- Add tax handling, support contact, returns, privacy, terms and shipping policies.
- Add monitoring for failed webhooks and Prodigi order issues.

4. Limitations

- Sandbox only; no shirts are actually produced.
- US-only, black shirts, one item per checkout.
- Stripe metadata currently acts as the order ledger; no dedicated admin/order database.
- Prodigi callbacks are logged but not persisted.
- Physical print quality and placement still require a sample order.

5. Key decisions

- Hosted Stripe Checkout reduces PCI exposure.
- The timestamp freezes when checkout starts.
- Signed deterministic artwork URLs let Prodigi fetch immutable print files.
- Stripe webhooks plus Prodigi idempotency prevent lost or duplicate orders.
- Prodigi replaced the original Scalable Press integration using current global apparel SKUs.

6. Friction

Stripe Projects required browser-authenticated access to a live Stripe account, which was unavailable autonomously. I used Stripe’s claimable sandbox flow instead; the human must claim it and initialize Stripe Projects. Prodigi also reports the expected US sales-tax warning on sandbox quotes.
