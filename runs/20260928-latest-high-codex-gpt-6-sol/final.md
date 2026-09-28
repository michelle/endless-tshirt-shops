[Nightmark is deployed](https://benchmark-20260928-latest-high-code.vercel.app). Customers can personalize a constellation-style tee with a date, place, title, and short message, then preview shirt colors and sizes.

**Checkout is not active yet.** No Stripe credentials were available, so the payment button reports that setup is pending. The implemented flow creates a [Stripe Checkout](https://docs.stripe.com/api/checkout/sessions) session and submits an order to Prodigi only after a verified webhook confirms payment. Prodigi is configured for its [sandbox](https://www.prodigi.com/print-api/docs/reference/), which does not print or ship shirts.

You can test the live personalization now. I also verified the deployed storefront, the 3000×4000 transparent print artwork, and that unsigned artwork requests are rejected. I could not run a paid test order.

To test the full order path, add `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` to this Vercel project’s Production environment, register `https://benchmark-20260928-latest-high-code.vercel.app/api/webhook` for `checkout.session.completed`, and redeploy. Then use a Stripe test card and confirm the order appears once in Prodigi sandbox. Setup details are in [README.md](/var/folders/mq/v8s9bp2x5gg6gvywwjfszb8r0000gn/T/benchmark-workspace.SYPeD1/README.md).

Before accepting real orders, approve a physical print sample, switch both Stripe and Prodigi to live credentials, and add tax handling, customer support details, and order monitoring.