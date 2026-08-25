## 1. Built and deployed

A production-oriented rebuild featuring:

- Live millisecond timestamp tee preview
- Fitted and unisex Prodigi garments with size selection
- Responsive, accessible storefront
- Stripe-hosted test checkout for $22.50
- Signed, 300-DPI transparent print artwork
- Webhook-driven Prodigi sandbox fulfillment
- Idempotent webhook retries and success-page recovery
- Security headers, validation, analytics, tests, and zero audited vulnerabilities

Deployed URL: **https://benchmark-20260825-harness6-high-co-kappa.vercel.app**

Verified Prodigi sandbox order: `ord_1168851`

## 2. Run and verify

See [README.md](/var/folders/mq/v8s9bp2x5gg6gvywwjfszb8r0000gn/T/benchmark-workspace.dhXBZZ/README.md).

```bash
npm install
cp .env.example .env.local
npm run dev
```

Quality checks:

```bash
npm run test
npm run lint
npm run build
npm audit --omit=dev
```

To test the deployed flow, select a fit and size, click “Capture this moment,” and use Stripe test card `4242 4242 4242 4242`, any future expiry/CVC, and a US, Canada, UK, Australia, or New Zealand address. Completing checkout creates a Prodigi sandbox order.

## 3. Required before real customers

- Claim the temporary Stripe sandbox before **September 1, 2026** using `stripe sandbox claim`.
- Replace the temporary Stripe key with a permanent live key.
- Create a live Stripe webhook for:
  - `checkout.session.completed`
  - `checkout.session.async_payment_succeeded`
- Replace `PRODIGI_API_KEY` with a production key and change `PRODIGI_API_BASE` to `https://api.prodigi.com/v4.0`.
- Order physical samples of both garments and confirm print sizing.
- Recalculate the $22.50 price against Prodigi production, shipping, tax, refund, and Stripe costs.
- Configure a custom domain, support email, privacy policy, terms, shipping policy, and returns policy.
- Enable Stripe tax/VAT handling where legally required.

## 4. Limitations and assumptions

- Stripe and Prodigi are the current systems of record; there is no separate order database or admin dashboard.
- Pricing is fixed in USD with free shipping.
- Discounts, automated returns, tax calculation, inventory management, and shipment-status emails are not implemented.
- Prodigi sandbox asset processing remained asynchronous during the short verification window, though the order was accepted and its signed artwork URL returned a valid PNG.
- The environment’s interactive browser was unavailable, so hosted checkout wasn’t completed with browser automation. Stripe Session creation and the signed webhook → Prodigi path were independently verified end to end.

## 5. Key decisions

- Used Next.js serverless routes for a straightforward Vercel deployment.
- Used Stripe Checkout to reduce PCI scope and securely collect addresses.
- Matched the original choices to Bella + Canvas 6004 fitted and 3003 unisex Prodigi SKUs.
- Made the Stripe Session ID the Prodigi idempotency key, preventing duplicate orders during webhook retries.
- Added success-page fulfillment recovery so delayed webhook delivery cannot strand a paid order.
- Generated immutable signed artwork URLs instead of storing customer artwork files.

## 6. Friction encountered

- The browser-control environment was unavailable.
- Vercel still accepts the required explicit `--name`, but warns that the option is deprecated.
- Prodigi returns `AlreadyExists` for successful idempotent retries; this was discovered during deployed testing, handled correctly, and covered by a regression test.
- The Stripe CLI provisioned a temporary claimable sandbox rather than a permanent account-owned test project.