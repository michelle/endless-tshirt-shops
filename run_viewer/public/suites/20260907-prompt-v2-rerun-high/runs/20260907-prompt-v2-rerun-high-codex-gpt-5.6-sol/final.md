The store is live: [Night Shift Field Club](https://benchmark-20260907-prompt-v2-rerun-five.vercel.app)

It includes three original nocturnal designs, size/color selection, persistent cart management, responsive checkout, validation, and real Prodigi sandbox fulfillment. I successfully created test order `ord_1170918`; Prodigi reported no issues.

To test:

1. Click “Choose yours” on a shirt.
2. Select a size and color, then add it to the bag.
3. Adjust quantities and open “Sandbox checkout.”
4. Enter test shipping details and create the order.

No payment is taken and nothing ships because Prodigi’s sandbox is explicitly non-billing and non-fulfilling. [Prodigi API reference](https://www.prodigi.com/print-api/docs/reference/)

Production gaps:

- Add Stripe or another payment provider; submit fulfillment only after a verified payment webhook.
- Replace the sandbox key with a Prodigi live key, then set `PRODIGI_API_BASE_URL=https://api.prodigi.com` and `ENABLE_LIVE_FULFILLMENT=true`.
- Reproduce the artwork at Prodigi’s recommended print resolution and order physical color/placement samples.
- Add live shipping quotes, taxes, transactional email, order tracking, refunds, policies, rate limiting, and durable idempotency.
- Connect a custom domain and complete cross-browser/mobile QA.

The artwork is saved under `public/designs/`. It was generated using the built-in image tool from three original print briefs: a luna-moth moon garden, a bioluminescent octopus tidepool, and a burrowing-owl meteor watch.