[Open Field Notes Club](https://benchmark-20260907-prompt-v3-rerun-high-codex-gpt-6-astra.vercel.app) — personalized park tees featuring the customer’s place, people, year, motto, and palette. $38 plus $6 US shipping.

**The storefront is deployed, but payments remain blocked:** the supplied Stripe configuration file is empty. Stripe Checkout and payment-gated Prodigi fulfillment are implemented, but the complete payment-to-print flow could not be tested. No orders were submitted without payment.

To test:

1. Try the customization fields, palettes, sizes, and live artwork preview.
2. Supply a Stripe test secret key, then run:
   ```sh
   node scripts/configure-stripe.mjs
   vercel --prod --yes
   ```
3. Complete checkout using `4242 4242 4242 4242`, any future expiry, and any three-digit CVC. Confirm the resulting Prodigi sandbox order; refresh and replay the webhook to check duplicate prevention.

Verified: ten automated tests, public endpoints, full-resolution print downloads, and actual Prodigi product and shipping quotes.

Before production, you’ll need live Stripe/Prodigi credentials, sales-tax handling, a physical print sample, support and returns policies, and fulfillment monitoring. Current scope is one white tee per checkout, US shipping, and English-letter personalization. Shipping emails and automatic refund/cancellation coordination aren’t implemented.

The [setup and testing guide](/var/folders/mq/v8s9bp2x5gg6gvywwjfszb8r0000gn/T/benchmark-workspace.8OITst/README.md) includes complete instructions, limitations, and asset details.