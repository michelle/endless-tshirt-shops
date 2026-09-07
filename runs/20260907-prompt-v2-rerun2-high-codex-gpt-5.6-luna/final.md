Done: [Nightshift Supply](https://benchmark-20260907-prompt-v2-rerun2-plum.vercel.app/) is live.

Test it:

1. Choose a shirt size.
2. Click “Add to bag.”
3. Open the bag and continue to checkout.
4. Use any test customer/address details.
5. Submit the sandbox order.

The deployed checkout successfully created a Prodigi sandbox order. Sandbox orders are not charged or fulfilled. [Prodigi API reference](https://www.prodigi.com/print-api/docs/reference/)

Known gaps:

- No payment provider, tax calculation, returns flow, or customer accounts.
- Orders currently use Prodigi sandbox.
- No persistent order database, customer emails, or webhook-based tracking.
- Product catalog and pricing are hard-coded.

To launch commercially:

- Replace the Vercel `PRODIGI_API_KEY` with a live key.
- Set `PRODIGI_ENVIRONMENT=live`.
- Add Stripe or another payment provider before creating live Prodigi orders.
- Add order persistence, confirmation emails, tax/shipping rules, legal pages, and Prodigi webhooks.
- Configure a custom domain and run end-to-end live fulfillment tests.