Deployed **[Elsewhere Club](https://elsewhere-club-personal-tees.hazelcough.chatgpt.site)**: personalized travel-poster tees featuring the customer’s place, date, dedication, landscape, and palette.

**Payment remains blocked by missing Stripe credentials.** Stripe Checkout and payment-verified Prodigi fulfillment are implemented, but checkout is disabled until your Stripe account is connected. The paid-order requirement is therefore not yet complete.

- **Test now:** customize a shirt, inspect the preview, and download its transparent 2490 × 3510 PNG. Deployed Prodigi shipping quotes work.
- **Test payment:** configure `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`, then redeploy. Use Stripe’s [test card instructions](https://docs.stripe.com/testing). Successful payment should create a Prodigi sandbox order; nothing physically ships.
- **Before production:** connect live Stripe/Prodigi credentials, order physical samples, configure taxes, finalize support and returns/privacy policies, and add fulfillment monitoring.

Nine automated tests passed, including unpaid-order blocking, webhook verification, and duplicate prevention. Current limitations include US-only delivery, one shirt per checkout, and no automated refunds or customer emails.

[Setup instructions and known gaps](</private/var/folders/mq/v8s9bp2x5gg6gvywwjfszb8r0000gn/T/benchmark-workspace.wJCxbi/store/README.md>) · [Download source](</private/var/folders/mq/v8s9bp2x5gg6gvywwjfszb8r0000gn/T/benchmark-workspace.wJCxbi/elsewhere-club-source.zip>)