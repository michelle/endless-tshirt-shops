Deployed: [Futurefolk storefront](https://benchmark-20260910-prompt-v3-high-c-three.vercel.app)

It sells one-of-one DTG “field-guide” tees customized by name, home base, personal credo, mood, color, and size. Checkout uses Stripe; only Stripe’s verified successful-payment webhook sends the DTG order to Prodigi. I validated the exact Prodigi shirt payload in sandbox (`Created`, order `ord_1171331`).

To test:

1. Open the storefront and customize a tee.
2. Choose “Make it mine.”
3. Use Stripe test card `4242 4242 4242 4242`, any future expiry/CVC, and a US shipping address.
4. After checkout, confirm the Stripe webhook delivery and inspect the resulting order in the Prodigi sandbox. Sandbox orders are not printed or charged. [Prodigi docs](https://www.prodigi.com/print-api/docs/reference/)

Before real launch:

- Claim/replace the temporary Stripe sandbox credentials with your Stripe production account, then set production Stripe keys and webhook secret in Vercel.
- Set `PRODIGI_API_BASE=https://api.prodigi.com/v4.0` and a live Prodigi key.
- Add tax calculation, a persistent orders/admin dashboard, customer email notifications, order-status webhooks, policies, and a custom domain.
- The current catalog is US-only Bella+Canvas 3003, in four colors and S–2XL.