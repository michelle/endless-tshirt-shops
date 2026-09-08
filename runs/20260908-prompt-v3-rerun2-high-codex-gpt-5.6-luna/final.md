Built and deployed the Signal Bloom custom DTG t-shirt store.

Live store: [Open Signal Bloom](https://benchmark-20260908-prompt-v3-rerun2-ten.vercel.app/)  
Vercel project: `benchmark-20260908-prompt-v3-rerun2-high-codex-gpt-5.6-luna`

Implemented:

- Phrase-based one-of-one shirt customization
- Signal styles, ink tones, shirt colors, and sizes
- Persistent shopping bag
- Server-side price validation
- Stripe Checkout integration
- Signed Stripe webhook fulfillment flow
- Prodigi sandbox order submission only after successful payment
- Dynamically generated print-ready PDF artwork, matching Prodigi’s accepted asset formats ([Prodigi docs](https://www.prodigi.com/print-api/docs/reference/))
- Prodigi idempotency protection for webhook retries

How to test:

1. Open the live store.
2. Enter a phrase such as `STAY CURIOUS`.
3. Choose a signal style, ink, color, and size.
4. Add it to the bag.

Known gap: Stripe credentials were not available, so checkout currently returns a clear configuration error. Add these to the Vercel Production environment:

```bash
vercel env add STRIPE_SECRET_KEY production --sensitive
vercel env add STRIPE_WEBHOOK_SECRET production --sensitive
vercel --prod
```

Then register a Stripe webhook at:

```text
https://benchmark-20260908-prompt-v3-rerun2-ten.vercel.app/api/stripe-webhook
```

Subscribe to `checkout.session.completed` and `checkout.session.async_payment_succeeded`. Stripe’s documented fulfillment model uses these webhook events after payment succeeds ([Stripe fulfillment docs](https://docs.stripe.com/checkout/fulfillment)).

For Stripe test mode, use `4242 4242 4242 4242`, any future expiry, and any CVC. The Prodigi sandbox will create test orders but will not charge or ship.

Before production, switch the Prodigi endpoint from sandbox to live, use live credentials, add durable order storage/retry handling, configure tax and shipping rules, and add legal/returns/customer-email flows.