1. Built and deployed

Production deployment: [datetime.store rebuild](https://benchmark-20260827-harness6-high-co-eight.vercel.app/)

Run-specific Vercel project: `benchmark-20260827-harness6-high-codex-luna`

Implemented:

- Live millisecond timestamp shirt preview
- Fitted/unisex styles and sizes
- Stripe test-mode Checkout
- Signed Stripe webhook fulfillment
- Prodigi Sandbox orders using `GLOBAL-TEE-BC-3001`
- Generated PNG artwork endpoint for Prodigi
- Success/cancel pages and health endpoint

The implementation follows the original product’s timestamp-shirt concept from the [reference repository](https://github.com/michelle/datetime.store), with hosted Stripe Checkout and metadata-based fulfillment patterns from [Stripe’s Checkout docs](https://docs.stripe.com/payments/checkout-sessions) and Prodigi’s [v4 API](https://www.prodigi.com/print-api/docs/reference/).

2. Run and verify

```bash
npm install
cp .env.example .env.local
npm run dev
```

Set:

```env
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
PRODIGI_API_KEY=...
APP_URL=http://localhost:3000
PRODIGI_ENV=sandbox
```

Verify:

- Open `http://localhost:3000`
- Select a fit and size
- Click “get the now tee”
- Use Stripe’s test card `4242 4242 4242 4242`
- Forward webhooks locally with `stripe listen --forward-to localhost:3000/api/webhook`
- Check `/api/health`

The deployed environment was verified with a real Stripe test Checkout Session, signature rejection, signed webhook delivery, generated PNG retrieval, and accepted Prodigi Sandbox order `ord_1169332`.

3. Steps before real customers

- Replace the Stripe sandbox key with a live Stripe secret key.
- Create a live-mode webhook for `/api/webhook` and set its live signing secret.
- Replace the Prodigi Sandbox key with a live Prodigi key and set `PRODIGI_ENV=live`.
- Confirm Prodigi product availability, pricing, shipping regions, and branding.
- Configure taxes, refund policy, terms, privacy policy, and a custom domain.
- Add durable order storage and webhook retry monitoring before launch.
- Claim or replace the temporary Stripe sandbox before it expires on September 4, 2026.

4. Known limitations

- No database or admin order dashboard is included.
- Webhook fulfillment is idempotent through Prodigi’s idempotency key, but operational retry/dead-letter tracking should be added.
- Shipping is currently limited to US, Canada, UK, Australia, and New Zealand.
- Tax calculation is not enabled.
- The generated artwork endpoint is intentionally public so Prodigi can download the print file.

5. Decisions

- Used Next.js server routes for a compact Vercel deployment.
- Used hosted Stripe Checkout to avoid handling card data directly.
- Frozen timestamp metadata is carried from Checkout into Prodigi fulfillment.
- Chose Prodigi’s global Bella+Canvas 3001 SKU for broad availability and simple variant handling.
- Used SVG/CSS for the product preview so the site has no external image dependency.

6. Friction

- Stripe sandbox auto-provisioning initially fell back to browser authentication; retrying with an email successfully created a temporary sandbox.
- Vercel accepted the required `--name` flag but marked it deprecated.
- Browser automation was unavailable, so the hosted customer flow was validated through HTTP, Stripe API session creation, signed webhook simulation, and Prodigi Sandbox acceptance.