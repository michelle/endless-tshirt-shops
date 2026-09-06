Deployed: [datetime.store](https://benchmark-20260905-unserious-high-c-three.vercel.app)

Test it by selecting a fit/size, clicking “freeze this moment,” and using Stripe’s test card `4242 4242 4242 4242` with any future expiry/CVC and a US shipping address. A successful payment reaches the success page and creates a Prodigi sandbox order. I verified the deployed checkout session, timestamp PNG, Stripe webhook registration, and a successful Prodigi sandbox smoke order.

The fulfillment flow is server-side and idempotent: Stripe’s signed payment webhook submits the timestamp artwork to Prodigi. Prodigi sandbox orders are free and never physically fulfill; their sandbox is explicitly designed for this. [Prodigi API docs](https://www.prodigi.com/print-api/docs/reference/)

Known gaps / next steps:

- It is configured for Stripe test mode and Prodigi sandbox, so it cannot ship a real shirt yet.
- The generated Stripe sandbox expires September 13, 2026; claim it with `stripe sandbox claim` on this machine if you want to retain it.
- For launch, replace the Stripe credentials/webhook secret and Prodigi key with live values, set `PRODIGI_API_BASE` to `https://api.prodigi.com/v4.0`, validate actual shipping costs, and ideally enable a Prodigi order pause window.
- The “fit” choice is visual/product metadata; fulfillment currently uses one black Prodigi tee SKU (`TEE-AS-5001`).