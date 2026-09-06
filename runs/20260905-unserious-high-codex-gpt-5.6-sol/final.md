Deployed: [datetime.store rebuild](https://benchmark-20260905-unserious-high-c-tau.vercel.app)

Implemented:

- Live millisecond shirt preview with fitted/unisex styles and sizes
- Stripe-hosted test checkout
- Signed Stripe webhook with idempotent fulfillment
- Prodigi sandbox integration using black Gildan 64000/64000L shirts
- Print-ready 4665×5844 timestamp artwork
- Responsive, accessible, deeply unserious design
- Security headers and zero known production dependency vulnerabilities

How to test:

1. Choose a fit and size, then click “Buy this exact millisecond.”
2. Use Stripe test card `4242 4242 4242 4242`, any future expiry, and any CVC.
3. Enter a valid shipping address.
4. The success page should display a Prodigi sandbox order ID.

Known gaps:

- I verified checkout creation and created Prodigi sandbox order `ord_1170588`, but did not personally complete the browser payment step.
- Orders are sandbox-only: nothing is charged, printed, or shipped.
- Order tracking lives in Stripe metadata and Prodigi; there’s no customer account, admin dashboard, or Prodigi callback history.
- Automatic sales tax and production shipping economics aren’t configured.

Next steps:

- Claim the temporary Stripe sandbox before September 13, 2026: `stripe sandbox claim --config "$BENCHMARK_STRIPE_CONFIG"`.
- Before real sales, replace both services with live credentials, change Prodigi to `https://api.prodigi.com/v4.0`, create a live Stripe webhook, and configure tax, shipping, returns, and customer communications.