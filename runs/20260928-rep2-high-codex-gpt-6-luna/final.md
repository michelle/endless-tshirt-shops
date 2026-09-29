## Deployed

[Open Somewhere, Always](https://benchmark-20260928-rep2-high-codex-five.vercel.app)

It’s a personalized “Memory Constellation” T-shirt shop. Customers customize the words, date, place, coordinates, color, and size, then preview a generated design. It uses Prodigi’s Bella+Canvas 3001 DTG tee and its `front` print area. ([Prodigi product listing](https://www.prodigi.com/products/mens-clothing/t-shirts/classic/bella-canvas-3001/))

I deployed it to the run-specific Vercel project `benchmark-20260928-rep2-high-codex-gpt-6-luna` and added the supplied Prodigi sandbox key as a sensitive Production variable. I confirmed the site and high-resolution PNG artwork endpoint respond. The payment path is integrated with Stripe Checkout and a signed webhook; fulfillment is submitted only after Stripe reports a paid session, with an idempotency key to prevent duplicate Prodigi orders.

## Current gap

Stripe credentials weren’t available, so checkout is currently disabled and returns a setup message. To activate it for testing:

1. In Vercel, add your **Stripe test-mode** secret key:
   ```sh
   vercel env add STRIPE_SECRET_KEY production --project benchmark-20260928-rep2-high-codex-gpt-6-luna --sensitive
   ```
2. In Stripe **test mode**, create a webhook endpoint at `https://benchmark-20260928-rep2-high-codex-five.vercel.app/api/stripe-webhook` for `checkout.session.completed` and `checkout.session.async_payment_succeeded`. Add its signing secret:
   ```sh
   vercel env add STRIPE_WEBHOOK_SECRET production --project benchmark-20260928-rep2-high-codex-gpt-6-luna --sensitive
   ```
3. Redeploy with `vercel deploy --prod --yes`, then customize a shirt and complete Checkout with Stripe’s test card `4242 4242 4242 4242`, any future expiry, and any CVC. ([Stripe test card instructions](https://docs.stripe.com/testing?numbers-or-method-or-token=tokens))
4. Confirm the payment in Stripe’s test dashboard and the resulting order in Prodigi’s sandbox dashboard. Sandbox orders are for testing and **won’t be printed or shipped**. ([Prodigi API docs](https://www.prodigi.com/print-api/docs/reference/))

## Before taking real orders

Checkout currently supports **US shipping only** at **$34 plus $5.95 standard shipping**. Shipping is a fixed amount rather than a live Prodigi quote, so validate costs and margins. Customers enter coordinates manually; the generated constellation is a personalized keepsake pattern, not an astronomical chart. The store also lacks an order-status page and published privacy, refund, and shipping policies.

For live fulfillment, set `PRODIGI_API_KEY` to your live key and `PRODIGI_API_BASE_URL` to `https://api.prodigi.com/v4.0`; switch Stripe to live credentials and a live-mode webhook secret, verify pricing and product variants, and publish your store policies and support contact.