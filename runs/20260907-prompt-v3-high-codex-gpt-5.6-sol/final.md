The store is deployed: [ORBIT/ONE](https://benchmark-20260907-prompt-v3-high-c-one.vercel.app)

ORBIT/ONE converts a customer’s place, date, and phrase into a deterministic orbital design, rendered at Prodigi’s recommended 4677 × 5787 print resolution.

### Testing

The customizer, responsive storefront, encrypted artwork generation, and Prodigi sandbox integration are live.

Payment requires two credentials that weren’t available in the environment:

1. Add `STRIPE_SECRET_KEY` to the Vercel production environment.
2. Create a Stripe webhook for:
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
3. Point it to:
   `https://benchmark-20260907-prompt-v3-high-c-one.vercel.app/api/webhooks/stripe`
4. Add its signing secret as `STRIPE_WEBHOOK_SECRET`.
5. Redeploy and pay using Stripe’s test card `4242 4242 4242 4242`.

Fulfillment runs exclusively from Stripe’s signed, paid webhook—not the success page—and Prodigi requests are idempotent. This follows [Stripe’s recommended fulfillment pattern](https://docs.stripe.com/payments/checkout/custom-success-page). Completed tests will appear in Prodigi’s sandbox without producing or charging for a shirt, as documented by [Prodigi](https://www.prodigi.com/print-api/docs/reference/).

### Production checklist

- Replace the Prodigi sandbox key and base URL with live credentials.
- Configure Stripe live-mode keys, webhook, taxes, and receipt branding.
- Add legal, privacy, returns, and customer-support pages.
- Add an order ledger and alerts for fulfillment failures.
- Confirm shipping margins by destination and order physical print samples.
- Add moderation for customer-entered print text.

The generated campaign asset is [orbit-one-hero.png](</var/folders/mq/v8s9bp2x5gg6gvywwjfszb8r0000gn/T/benchmark-workspace.gNOpRZ/store/public/orbit-one-hero.png>). It was created with built-in image generation using a premium cobalt studio-fashion brief with a black orbital-graphic tee.