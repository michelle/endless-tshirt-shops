# datetime.store

A production-minded rebuild of the original datetime.store: a live Unix-millisecond clock rendered on a black T-shirt, frozen at checkout, paid through Stripe Checkout, and fulfilled through Prodigi.

## Local setup

1. Use Node 20.9 or newer and run `npm install`.
2. Copy `.env.example` to `.env.local` and add Stripe test credentials plus a Prodigi sandbox API key.
3. Run `npm run dev` and open `http://localhost:3000`.

For webhook testing, forward Stripe events to `http://localhost:3000/api/webhooks/stripe` and put the returned signing secret in `STRIPE_WEBHOOK_SECRET`.

## Customer-flow verification

1. Select a size and note the live timestamp.
2. Click **Freeze this moment**. The number stops and Stripe Checkout opens.
3. Use Stripe's test card `4242 4242 4242 4242`, any future expiry, any CVC, and a valid US test address.
4. After payment, the success page displays the frozen timestamp and the Prodigi sandbox order ID.
5. Check `/api/health` for Stripe/Prodigi configuration and product availability.

Prodigi sandbox orders do not print, ship, or incur fulfillment charges.

## Production launch checklist

- Replace the temporary Stripe sandbox key with a live restricted secret key and claim/configure the Stripe account.
- Replace `PRODIGI_API_KEY` with a live Prodigi key and set `PRODIGI_API_BASE_URL=https://api.prodigi.com/v4.0`.
- Register the live Stripe webhook at `/api/webhooks/stripe` for `checkout.session.completed` and `checkout.session.async_payment_succeeded`.
- Update `SITE_URL` to the final custom domain.
- Review pricing, US sales-tax handling, refund/returns policy, privacy terms, support email, and order-pause settings.
- Place and inspect a physical sample before opening sales.
