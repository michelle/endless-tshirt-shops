The **Sonder Studio** storefront is deployed: [open the store](https://benchmark-20260928-rep3-high-codex.vercel.app/). Customers can customize a “Moment Map” tee with a place, date, and message and see the design update live.

**Checkout is not yet available.** The environment had a Prodigi sandbox key but no payment credentials. I integrated Stripe Checkout so that only a verified, successful payment webhook can submit a shirt to Prodigi; checkout currently stays closed until Stripe is configured.

To test it now, open the store and change the design fields, color, and size. I verified the deployed page and artwork endpoint return successfully, and unsigned artwork and webhook requests are rejected.

To test an order, add a Stripe **test-mode secret key** and **webhook signing secret** to the Vercel project, then configure the webhook and redeploy. The exact endpoint, events, and steps are in [README.md](/var/folders/mq/v8s9bp2x5gg6gvywwjfszb8r0000gn/T/benchmark-workspace.ErvAEL/README.md). After a test-card payment, check that Stripe reports successful webhook delivery and that the order appears in Prodigi’s sandbox. That paid end-to-end path remains untested until those credentials are available.

Before taking real orders, switch both services to live credentials, confirm taxes and shipping margins, review customer policies, and order a physical sample. [Prodigi’s sandbox does not print or ship](https://www.prodigi.com/print-api/docs/reference/).