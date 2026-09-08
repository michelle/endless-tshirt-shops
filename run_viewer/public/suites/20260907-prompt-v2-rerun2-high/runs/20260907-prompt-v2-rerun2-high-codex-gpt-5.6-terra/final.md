Built and deployed: [Night Shift Field Club](https://benchmark-20260907-prompt-v2-rerun2-one.vercel.app/)

How to test:

- Choose a shirt color, size, and quantity.
- Select “Add to bag,” complete the checkout form, and submit.
- It creates a real Prodigi sandbox fulfillment order—no payment, charge, or shipment occurs.

Verified end-to-end: storefront, public print asset, and Prodigi order creation (sandbox order `ord_1170946`).

Known gaps before real sales:

- Checkout is sandbox-only; no card payments.
- One original shirt design with three colorways; more designs can be added.
- Shipping/tax is not quoted at checkout.
- No persistent customer orders, email receipts, tracking page, or Prodigi webhooks.
- The supplied artwork is web-quality; replace it with a higher-resolution print master before live fulfillment.

To launch for production: add Stripe (or another payment provider), add your live Prodigi key and change the endpoint from sandbox to production, implement taxes/shipping quotes and order webhooks, upload high-resolution print artwork, and publish your policies (returns, privacy, terms).