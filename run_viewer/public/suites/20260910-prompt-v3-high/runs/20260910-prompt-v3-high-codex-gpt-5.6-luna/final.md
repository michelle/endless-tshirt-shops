Built and deployed: [Orbital Post](https://benchmark-20260910-prompt-v3-high-codex-gpt-56-luna-b4mkxuxd4.vercel.app/)

Project: `benchmark-20260910-prompt-v3-high-codex-gpt-5.6-luna`

Features:

- Personalized orbital-postcard t-shirt builder
- Live preview with place, name, message, accent, size, and color
- Print-ready 4200×5370 PNG artwork
- Stripe Checkout integration
- Signed Stripe webhook
- Prodigi sandbox fulfillment using `TEE-AS-5001`
- Prodigi submission only after confirmed payment
- Idempotent Prodigi orders
- Production build and deployment verified
- `npm audit`: zero vulnerabilities

How to test:

1. Open the storefront and customize the tee.
2. Add Stripe test credentials to the Vercel project:

   ```bash
   vercel env add STRIPE_SECRET_KEY production
   vercel env add STRIPE_WEBHOOK_SECRET production
   ```

3. Register this Stripe webhook:

   ```
   https://benchmark-20260910-prompt-v3-high-codex-gpt-56-luna-b4mkxuxd4.vercel.app/api/webhook
   ```

   Listen for:

   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`

4. Redeploy with `vercel --prod`.
5. Use Stripe’s test card `4242 4242 4242 4242`.

Current gap: no Stripe credentials were available in the environment, so checkout intentionally returns a configuration message until those are added. The provided Prodigi key is sandbox-only; sandbox orders do not produce or ship garments. [Prodigi API docs](https://www.prodigi.com/print-api/docs/reference/)

Before going live, switch to live Stripe and Prodigi credentials, configure a custom domain, add tax/legal/returns pages, persistent order records, retry handling, customer emails, and monitoring. Stripe fulfillment should remain webhook-driven, as documented by [Stripe](https://docs.stripe.com/checkout/fulfillment).