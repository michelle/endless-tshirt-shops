Deployed: [datetime.store rebuild](https://benchmark-20260906-minimal-inspecto-inky.vercel.app/)

The site includes live timestamp rendering, fitted/unisex products, size selection, Stripe test checkout, signed 4665×5844 print artwork, and idempotent Prodigi fulfillment. I verified the deployed checkout API, Stripe webhook registration, and created Prodigi sandbox order `ord_1170762`.

### Test it

1. Select a fit and size.
2. Click **Buy this moment**.
3. Use Stripe test card `4242 4242 4242 4242`, any future expiry/CVC, and a US address.
4. After checkout, the confirmation page should display the frozen timestamp and Prodigi order ID.

No real charge, print, or shipment occurs.

### Known gaps

- Checkout currently supports US shipping only.
- Prodigi is intentionally using its sandbox.
- There’s no separate order database or transactional email system; Stripe and Prodigi remain the systems of record.
- Shipping, sales tax, returns, privacy terms, and support details need final business decisions before accepting real orders.

### Next steps

- Claim the temporary Stripe sandbox by September 14, 2026 with `stripe sandbox claim`, or replace it with your permanent Stripe credentials.
- Before going live, provide a Prodigi production key, switch the API base to `https://api.prodigi.com`, configure Stripe live-mode credentials/webhook, and remove the test-mode notice.
