Deployed: [Tiny Triumphs store](https://benchmark-20260913-prompt-v3-smoke.vercel.app)

It’s a customizable DTG tee shop: customers enter a personal “tiny triumph,” name, badge, color, and size, with a live shirt preview. Payment is integrated through Stripe Checkout; only a verified `checkout.session.completed` payment webhook submits the order to Prodigi. The fulfillment art is generated as a signed, print-ready transparent PNG per order.

What’s still needed to test payment end-to-end:

1. Add `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` to the Vercel project’s Production environment.
2. In Stripe, add a webhook for:
   `https://benchmark-20260913-prompt-v3-smoke.vercel.app/api/webhooks/stripe`
   listening to `checkout.session.completed`.
3. Redeploy, then customize a tee and use Stripe’s test card `4242 4242 4242 4242`.
4. Confirm the resulting order in the Prodigi sandbox dashboard.

Known gaps before real production:

- Checkout is deliberately disabled until Stripe credentials are supplied; the live site currently returns a safe “temporarily unavailable” response instead of risking fulfillment without payment verification.
- Fulfillment is currently routed to Prodigi sandbox. Set `PRODIGI_API_BASE_URL=https://api.prodigi.com` and replace the key with a live Prodigi key for real printing/shipping.
- Shipping is US-only with a flat $5.99 rate; taxes, international shipping, customer order tracking, and branded transactional emails are not yet implemented.
