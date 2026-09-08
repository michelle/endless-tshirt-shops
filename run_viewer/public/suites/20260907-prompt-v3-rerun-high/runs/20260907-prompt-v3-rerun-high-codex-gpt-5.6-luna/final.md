Store deployed: [Make It Yours](https://benchmark-20260907-prompt-v3-rerun-zeta.vercel.app)

What’s included:

- Live customizer for phrase, name, badge, size, and quantity.
- DTG-ready personalized print artwork endpoint.
- Stripe Checkout integration.
- Paid-only Prodigi fulfillment via Stripe webhook.
- Prodigi sandbox key configured and SKU verified.

Test it:

1. Open the link and customize the shirt.
2. Add Vercel production env vars:
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
3. Configure Stripe webhook:
   `https://benchmark-20260907-prompt-v3-rerun-zeta.vercel.app/api/stripe-webhook`
4. Enable `checkout.session.completed`.
5. Redeploy, then use Stripe test card `4242 4242 4242 4242`.

Known gaps:

- Stripe credentials were not available, so checkout currently returns “Payments are not connected yet.”
- Prodigi is in sandbox mode; sandbox orders are not produced or shipped. [Prodigi docs](https://www.prodigi.com/print-api/docs/reference/)
- No persistent order database, admin dashboard, email notifications, dynamic tax, or live shipping-rate calculation.
- Webhook fulfillment is implemented; Stripe’s paid-session webhook is the fulfillment trigger. [Stripe fulfillment docs](https://docs.stripe.com/checkout/fulfillment)

For production, add Stripe live keys/webhook, switch Prodigi to `PRODIGI_ENVIRONMENT=live` with a live key, configure a custom domain, and add durable order/idempotency storage.