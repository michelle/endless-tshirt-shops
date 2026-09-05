## Deployed

[Open datetime.store](https://benchmark-20260905-beauty-high-code-ten.vercel.app)

Built in the requested Vercel project with:

- Live millisecond preview and “freeze this moment” interaction
- Responsive product configurator
- Stripe-hosted test checkout
- Automatic, idempotent Prodigi sandbox fulfillment
- Production-resolution transparent print artwork
- Stripe webhook and success-page recovery flow
- Custom social sharing artwork matching the storefront
- Security headers, input validation, clean production build, and zero production dependency vulnerabilities

The Prodigi integration was verified with sandbox order `ord_1170506`; its artwork downloaded successfully with no issues.

## How to test

1. Open the site and select “Choose your moment.”
2. Freeze a timestamp, choose a size and quantity, then continue to checkout.
3. Enter a U.S. shipping address.
4. Use Stripe test card `4242 4242 4242 4242`, any future expiry, and any CVC.
5. After payment, the confirmation page should display the timestamp, size, and Prodigi sandbox order ID.

Stripe follows its recommended hosted Checkout and webhook fulfillment model. [Stripe Checkout documentation](https://docs.stripe.com/payments/checkout/how-checkout-works)

## Known gaps and next steps

- Claim the temporary Stripe sandbox before **September 12, 2026**: [Claim Stripe sandbox](https://dashboard.stripe.com/onboard_sandbox/YWNjdF8xVUNIQWhMUkwwUHg1V3NXLDE3ODkyMzEyNjUv100oyG7eN67)
- Prodigi remains in sandbox mode, so orders are neither charged nor manufactured. [Prodigi sandbox documentation](https://www.prodigi.com/blog/your-first-print-api-order/)
- Before taking live orders, add the Prodigi live key, switch the API hostname, order and approve physical samples, and confirm pricing.
- Configure sales tax, legal pages, returns, customer support, and operational alerts.
- The current launch product is a black Gildan 2000 tee, sizes S–2XL, shipping to U.S. addresses only. [Product specifications](https://www.prodigi.com/products/mens-clothing/t-shirts/classic/gildan-2000/)
- Stripe metadata and Prodigi idempotency protect against duplicate fulfillment, but a durable order database and retry queue would be advisable before meaningful production volume.