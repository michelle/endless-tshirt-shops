Built and deployed datetime.store:

https://benchmark-20260904-harness7-high-co.vercel.app

It recreates the original’s live timestamp-on-black-tee experience, adds responsive product selection, Stripe Checkout, a signed Stripe webhook, and Prodigi v4 fulfillment using the black Gildan 64000 SKU. Prodigi sandbox ordering was verified successfully.

Run locally:

```bash
npm install
cp .env.example .env.local
npm run dev
```

Verification completed:

- Production build passed.
- Deployed artwork route returns the generated high-resolution print asset.
- A real Stripe test Checkout Session was created.
- Stripe test event trigger completed.
- Prodigi sandbox accepted a test order.

Before real customers:

1. Claim the temporary Stripe sandbox (`stripe sandbox claim`) before it expires, then replace test credentials with your Stripe live keys.
2. Make the production domain publicly reachable. This Vercel team currently protects the deployment, so Stripe and Prodigi cannot reach webhook/artwork URLs externally. Either use a public custom domain or configure Vercel Protection Bypass for Automation and update the Stripe webhook URL with its bypass parameter. Vercel documents both approaches [here](https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection).
3. Add Prodigi live credentials and set `PRODIGI_ENV=live`; confirm pricing, taxes, shipping regions, and product availability before launch.
4. Set up Prodigi callbacks/order monitoring and a durable order database for operational support.

Known limitation: checkout works in Stripe test mode, but actual webhook-driven fulfillment is blocked until Vercel deployment protection is opened or bypassed. The current $30 price includes US standard shipping as a product decision; validate margin against live Prodigi quotes.

Key decisions: I retained the original’s timestamp-as-product idea, modernized it into a minimal editorial storefront, used hosted Stripe Checkout to avoid handling card data, and generate a unique printable timestamp asset server-side for Prodigi. The main friction was missing Stripe Projects authentication and Vercel’s protection layer; I provisioned a Stripe sandbox directly and configured the integration, but the protection policy requires the human’s final access decision.