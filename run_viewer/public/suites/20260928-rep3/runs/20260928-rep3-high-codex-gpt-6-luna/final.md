## Deployed

[Open Little Night Garden](https://benchmark-20260928-rep3-high-codex-two.vercel.app)

The Vercel production build is ready. Customers can personalize a botanical shirt design with a name, place, date, and bloom. A signed Stripe webhook sends orders to Prodigi **only after Stripe confirms payment**.

**Checkout is currently disabled:** no Stripe credentials were available, so the store fails closed instead of taking payment without a working fulfillment path. The Prodigi sandbox key and artwork encryption secret are already configured.

## Enable a test order

1. In Stripe test mode, create a webhook for `https://benchmark-20260928-rep3-high-codex-two.vercel.app/api/webhook`, subscribed to `checkout.session.completed`.
2. Add the Stripe test secret key as `STRIPE_SECRET_KEY` and that webhook’s signing secret as `STRIPE_WEBHOOK_SECRET` in the Vercel project’s **Production** environment. Redeploy.
3. Make a design, choose a shirt size and color, and pay with Stripe’s test card `4242 4242 4242 4242` (any future expiry and CVC).
4. Check the Stripe event and Prodigi sandbox dashboard for the order.

Prodigi sandbox orders are for testing only; they are not charged or printed and shipped. [Prodigi API documentation](https://www.prodigi.com/print-api/docs/reference/)

## Gaps and production steps

The store charges **$42 plus $5.95 shipping**. Shipping is a flat rate, taxes aren’t calculated, and shipment tracking or status emails aren’t connected. The site also needs your customer service, privacy, and returns policies before launch.

For production, add live Stripe keys and a live webhook signing secret, set `PRODIGI_API_BASE` to `https://api.prodigi.com`, and replace the sandbox Prodigi key with a live key. Confirm product and shipping costs, tax handling, and policies before accepting live orders. The setup details are in [README.md](/private/var/folders/mq/v8s9bp2x5gg6gvywwjfszb8r0000gn/T/benchmark-workspace.pF36mD/README.md).