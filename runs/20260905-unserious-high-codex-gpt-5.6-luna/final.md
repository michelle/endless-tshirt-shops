Built and deployed: [datetime.store](https://benchmark-20260905-unserious-high-c-nu.vercel.app)

What’s included:

- Live millisecond timestamp T-shirt preview
- Fitted/unisex cuts and S–XL sizing
- Stripe-hosted test checkout with free shipping
- Stripe webhook + success-page fulfillment fallback
- Prodigi sandbox order creation using a generated public PNG artwork asset
- Dedicated Vercel project: `benchmark-20260905-unserious-high-codex-gpt-5.6-luna`
- Final build and smoke tests passing; zero npm audit vulnerabilities

How to test:

1. Open the deployed URL.
2. Choose a cut and size.
3. Click “Buy the shirt →”.
4. Use Stripe’s test card `4242 4242 4242 4242`, any future expiry, and any CVC.
5. Enter a shipping address in the US, Canada, UK, or Australia.
6. After checkout, the page should show the accepted Prodigi order reference.

Known gaps / next steps:

- Prodigi is currently sandbox-only. Sandbox orders are not charged or fulfilled. [Prodigi sandbox documentation](https://www.prodigi.com/print-api/docs/reference/)
- “Fitted” and “Unisex” currently change the preview and metadata but fulfill through the same AS Colour SKU.
- There is no persistent order database or admin/order-status dashboard yet.
- To go live: replace the Stripe sandbox credentials and webhook with live credentials, replace the Prodigi key, and set `PRODIGI_API_BASE_URL` to `https://api.prodigi.com/v4.0/orders`.