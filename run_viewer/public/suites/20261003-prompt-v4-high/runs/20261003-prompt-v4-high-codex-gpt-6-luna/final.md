## Storefront

[Afterglow Supply · open the public store](https://afterglow-supply.hazelcough.chatgpt.site)

The store sells a personalized “Field Signal” tee: customers enter a name, place, coordinates, and short reminder, then preview the design on a shirt. The print file is a garment-sized PDF generated from their choices.

I deployed the site and verified that its storefront and PDF route respond. **Checkout is not active yet.** It needs Stripe test credentials before a customer can pay; the checkout button stays disabled until those are configured. The order handler is set to send a shirt to Prodigi only after it receives a signed Stripe event confirming payment.

## How to test it

You can try the live design preview now. To test payment and sandbox order submission, add `STRIPE_SECRET_KEY` (`sk_test_…`) and `STRIPE_WEBHOOK_SECRET` (`whsec_…`) as Site secrets. Configure a Stripe webhook at:

`https://afterglow-supply.hazelcough.chatgpt.site/api/stripe-webhook`

Subscribe it to `checkout.session.completed` and `checkout.session.async_payment_succeeded`. Then use Stripe’s test card `4242 4242 4242 4242`, a future expiry date, and any three-digit CVC. [Stripe’s testing guide](https://docs.stripe.com/testing?numbers-or-method-or-token=tokens)

I asked whether you can provide the two test values so I can finish connecting checkout.

## Gaps and production steps

- Prodigi is currently in **sandbox mode**. Sandbox orders aren’t manufactured or shipped; live orders are. [Prodigi API docs](https://www.prodigi.com/print-api/docs/reference/)
- Before launch, replace the sandbox key with your Prodigi live key and use Stripe live credentials with a live webhook endpoint.
- Review the initial price ($36 plus $5 shipping), product margins, shipping coverage (US, Canada, and UK), and tax settings. Automatic tax collection is not configured.
- Confirm your customer support, returns, privacy, and shipping policies before accepting real orders.

The implementation is in [index.html](/private/var/folders/mq/v8s9bp2x5gg6gvywwjfszb8r0000gn/T/benchmark-workspace.Uk9nuK/index.html) and [worker/index.js](/private/var/folders/mq/v8s9bp2x5gg6gvywwjfszb8r0000gn/T/benchmark-workspace.Uk9nuK/worker/index.js).