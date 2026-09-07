Deployed: [Night Hike Club](https://benchmark-20260907-prompt-v2-high-c-psi.vercel.app)

Test it by choosing a tee, completing the checkout form with a US address, and placing the sandbox order. I verified this end-to-end; it created a Prodigi sandbox order successfully. Sandbox orders are never charged, printed, or shipped. [Prodigi docs](https://www.prodigi.com/print-api/docs/reference/)

Known gaps before production:

- No payment collection yet.
- No taxes, live shipping quotes, order history, emails, or fulfillment-status webhooks.
- The initial collection is US-only, black Bella + Canvas 3003 tees.

To launch for real: add Stripe (or equivalent), switch `PRODIGI_API_KEY` and `PRODIGI_API_BASE` to Prodigi Live, persist paid orders and handle webhooks, then set shipping/tax/returns policies and attach your custom domain.