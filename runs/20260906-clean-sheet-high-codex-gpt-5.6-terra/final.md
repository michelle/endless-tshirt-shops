Deployed: [Trail Marker Supply](https://benchmark-20260906-clean-sheet-high-two.vercel.app)

How to test:

1. Choose a color and size, then select “Add to pack.”
2. Complete Stripe Checkout with `4242 4242 4242 4242`, any future expiry, and any CVC. [Stripe test-card reference](https://docs.stripe.com/testing?numbers-or-method-or-token=tokens)
3. A paid sandbox checkout invokes the Stripe webhook and creates a corresponding Prodigi sandbox fulfillment request.

What’s included: a polished outdoor-themed storefront, Stripe Checkout, webhook validation, and a Prodigi integration targeting the American Apparel 1301 heavyweight tee with a print-ready 2490×3510 artwork file.

Known gaps / next steps:

- It is in Stripe and Prodigi sandbox mode—no real payment or garment shipment occurs.
- The temporary Stripe sandbox should be replaced with your own Stripe account/key before launch.
- Switch the Prodigi endpoint/key to live production, configure billing/order pause settings, and test a sample order.
- The current store supports one shirt and US delivery; there’s no order database, customer email, or production-status dashboard yet.