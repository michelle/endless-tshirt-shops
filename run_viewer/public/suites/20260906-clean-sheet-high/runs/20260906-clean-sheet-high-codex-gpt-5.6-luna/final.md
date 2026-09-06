Built and deployed: [Night Shift Club](https://benchmark-20260906-clean-sheet-high-teal.vercel.app/)

It sells a timestamp-themed “Current Moment” tee with color, size, quantity selection, Stripe test checkout, signed webhooks, and Prodigi sandbox fulfillment. A live webhook smoke test created Prodigi order `ord_1170700` successfully.

How to test:

1. Open the store.
2. Choose options and click checkout.
3. Use Stripe test card `4242 4242 4242 4242`, any future expiry, and any CVC.
4. Enter a supported shipping address.
5. Stripe will send the completion webhook; Prodigi will create a sandbox order. Stripe Checkout is server-created per the [Checkout Sessions API](https://docs.stripe.com/api/checkout/sessions).

Known gaps:

- Stripe sandbox expires September 13, 2026.
- Prodigi sandbox does not charge or fulfill orders; it only validates/creates them. [Prodigi sandbox details](https://www.prodigi.com/faq/print-api/)
- Live shipping rates, tax calculation, legal pages, transactional email, and production inventory/pricing are not configured.
- Full scaffold lint reports issues in unused generated UI components; the app code itself passes focused lint.

Next steps:

- Claim or replace the temporary Stripe sandbox.
- Add live Stripe and Prodigi credentials.
- Switch the webhook/Prodigi endpoint to live mode.
- Configure shipping, taxes, domain, policies, and customer emails.