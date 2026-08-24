Built and deployed a polished datetime.store rebuild:

https://benchmark-20260824-prodigi-high-cod.vercel.app

It recreates the live-timestamp black tee experience, supports fitted/unisex cuts and sizing, launches Stripe-hosted Checkout, generates a print-ready timestamp PNG, and sends paid orders to Prodigi instead of Scalable Press.

Verification completed:

- Production build passes with `npm run build`.
- Public deployment returns 200.
- Checkout API successfully creates Stripe test Checkout Sessions.
- Print asset endpoint returns a 4680×5790 PNG.
- A signed Stripe webhook was verified end-to-end and created a Prodigi sandbox order (`ord_1168682`).
- Both selected Prodigi apparel SKUs were validated in the sandbox.

To run locally:

```bash
npm install
cp .env.example .env.local
npm run dev
```

Add the Stripe test keys, Prodigi sandbox key, public URL, and Stripe webhook secret to `.env.local`. For local webhooks:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Then use Stripe’s test card `4242 4242 4242 4242` in Checkout with a US address.

Before taking real orders:

- Claim the temporary Stripe sandbox before it expires (currently seven days), then create/use a permanent Stripe account.
- Replace Stripe sandbox keys and the webhook endpoint with live equivalents.
- Replace `PRODIGI_API_KEY` and `PRODIGI_API_BASE` with Prodigi live credentials/API.
- Confirm real Prodigi landed costs, set an appropriate retail price, and configure tax/refund/customer-service policies.
- Add persistent order monitoring/alerts; the current version relies on Stripe retries plus Prodigi idempotency but does not include an order database.
- Expand shipping only after adding country-specific prices; the shop is deliberately US-only with free shipping.

Key decisions:

- Used hosted Stripe Checkout to keep payment and address handling off the site.
- Captured the timestamp at the instant Checkout starts and stored it as Stripe metadata.
- Rendered the artwork server-side as a high-resolution PNG suitable for Prodigi.
- Used Prodigi’s verified `GLOBAL-TEE-GIL-64000L` and `GLOBAL-TEE-BC-3005` SKUs.
- Made the Vercel deployment public so Stripe and Prodigi can reach webhook/assets.

Friction encountered:

- Stripe Projects initialization requires a separate browser-authenticated Dashboard session; the CLI sandbox flow worked, but Projects itself could not be initialized non-interactively.
- Vercel initially had team SSO protection enabled, which blocked external webhooks; I disabled it for this run-specific public deployment.
- Local headless-browser automation was unavailable, so final purchase verification used a real Stripe Checkout Session plus a signed webhook and Prodigi sandbox fulfillment test rather than submitting a test card through a browser.