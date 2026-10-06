## Live store

[Night Atlas](https://night-atlas.hazelcough.chatgpt.site) is deployed and publicly reachable. It lets customers personalize a constellation design with a name, date, and place. The design is prepared as a **4680 × 5790 px transparent PNG** for the Bella+Canvas 3001 front print. [Prodigi product details](https://www.prodigi.com/products/mens-clothing/t-shirts/classic/bella-canvas-3001/), [Prodigi API reference](https://www.prodigi.com/print-api/docs/reference/)

## Current status and testing

The live page and Prodigi quote endpoint return successfully. For example, a medium black tee shipping to the US is **$35.52**, including standard shipping and a fixed $18.99 markup. I also generated and inspected a sample print image.

**Customers can’t complete checkout yet:** Stripe credentials weren’t available in the workspace. The store shows a setup message instead of opening checkout. Once Stripe is configured, orders go to Prodigi only after the signed webhook confirms payment. This uses Stripe’s recommended webhook fulfillment flow. [Stripe Checkout and fulfillment](https://docs.stripe.com/payments/existing-customers?platform=web&ui=stripe-hosted)

To enable a test purchase:

1. Open the store’s [`/setup` page](https://night-atlas.hazelcough.chatgpt.site/setup) for the webhook URL and required event list.
2. Add `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` as **Sites runtime secrets**, using Stripe test mode, and redeploy.
3. Add a test shirt to checkout and pay with Stripe’s test card `4242 4242 4242 4242`, any future expiry, and any CVC. [Stripe testing guide](https://docs.stripe.com/testing?numbers-or-method-or-token=tokens)
4. Confirm the webhook succeeds and the order appears in Prodigi’s sandbox.

## Gaps and production steps

- The Prodigi key is for **sandbox**, which validates orders but does not charge or print them. [Prodigi sandbox FAQ](https://www.prodigi.com/faq/print-api/)
- Tax calculation isn’t configured. The quoted price is in USD, includes standard shipping, and currently supports 12 destination countries.
- Before real sales, add Stripe live-mode secrets and a live webhook, replace the Prodigi sandbox key and API URL with live credentials, and configure tax handling, shipping destinations, returns, and customer policies. Place and review a live sample shirt before launch.

The storefront and integration source are in [worker/index.js](/private/var/folders/mq/v8s9bp2x5gg6gvywwjfszb8r0000gn/T/benchmark-workspace.bJ7RMl/worker/index.js).