Your t-shirt store is deployed:

[Open Night Market Signal](https://benchmark-20260907-prompt-v2-rerun-lemon.vercel.app)

Test it:

1. Choose a size and click **Add**.
2. Open the bag and click **Checkout**.
3. Use any test shipping details.
4. Click **Place sandbox order**.
5. You should receive a Prodigi order ID.

The checkout was verified end-to-end with Prodigi sandbox order `ord_1170923`. Sandbox orders are not charged, printed, or shipped. [Prodigi API docs](https://www.prodigi.com/print-api/docs/reference/)

Known gaps:

- No payment processor yet; checkout is sandbox-only.
- Prices and shipping are currently hardcoded/display-only.
- No database, order history, email notifications, refunds, tax handling, or webhook processing.
- Production artwork should be reviewed for exact print dimensions and color profiles.
- The endpoint needs rate limiting and stronger production validation.

To launch commercially, connect Stripe or another payment provider, create Prodigi orders only after successful payment, switch to the live Prodigi API/key, add order persistence and webhooks, configure tax/shipping/returns, and attach a custom domain.