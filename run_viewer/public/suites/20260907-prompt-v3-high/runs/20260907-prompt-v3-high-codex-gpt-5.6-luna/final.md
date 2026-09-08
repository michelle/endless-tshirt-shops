Deployed: [Signal / Noise](https://benchmark-20260907-prompt-v3-high-c-mauve.vercel.app/)

It’s a customizable DTG shirt store where each phrase becomes a unique signal-map graphic. The app includes:

- Live design preview
- Mood, size, color, and quantity selection
- Stripe Checkout integration
- Signed Stripe webhook fulfillment flow
- Prodigi AS Colour 5001 shirt integration with idempotency protection
- Prodigi sandbox API configured

How to test:

1. Open the deployed link.
2. Enter a phrase and adjust the options.
3. Click “Make this real”.
4. The design PNG endpoint is live and can be checked through the preview itself.

Known gap: no Stripe credentials were available, so checkout currently responds with a setup message. Add these production environment variables to Vercel:

```bash
vercel env add STRIPE_SECRET_KEY production
vercel env add STRIPE_WEBHOOK_SECRET production
vercel --prod
```

Configure Stripe webhook URL:

```text
https://benchmark-20260907-prompt-v3-high-c-mauve.vercel.app/api/webhooks/stripe
```

Subscribe to `checkout.session.completed`. After a paid session is verified, the webhook sends the order to Prodigi. The current Prodigi endpoint is sandbox, which does not charge or fulfill orders. [Prodigi API docs](https://www.prodigi.com/print-api/docs/reference/)

For production, switch the endpoint to `api.prodigi.com`, replace the sandbox key with a live key, configure tax/shipping pricing, add order persistence and monitoring, and complete refund/cancellation handling.