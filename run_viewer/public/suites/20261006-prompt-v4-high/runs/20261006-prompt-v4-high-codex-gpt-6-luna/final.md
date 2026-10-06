## Deployed

[Open Field Notes](https://field-notes-star-map-tees.hazelcough.chatgpt.site)

The store has a live, public design customizer for one-of-one constellation shirts. It generates a transparent, 4,680 × 5,790 px front-print PNG for a Bella+Canvas 3001 DTG shirt, with darker ink on the natural fabric option for contrast. The Worker, R2 artwork storage, and Prodigi sandbox integration are deployed.

**The store can’t take payments yet:** no Stripe credentials were available. Until you add them, checkout will show a setup message. The code creates a Prodigi order only after a verified Stripe webhook confirms payment is paid, following Stripe’s recommended webhook fulfillment flow.[Stripe Checkout webhooks](https://docs.stripe.com/payments/existing-customers?platform=web&ui=stripe-hosted)

## To test it

1. Add your Stripe **test** secret key and webhook signing secret to this Site’s runtime environment as `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`.
2. In Stripe, configure a webhook destination at `https://field-notes-star-map-tees.hazelcough.chatgpt.site/api/stripe-webhook` for `checkout.session.completed` and `checkout.session.async_payment_succeeded`.
3. Customize a shirt, complete checkout with a US address, and use Stripe’s test card `4242 4242 4242 4242` with any future expiry and CVC.[Stripe test cards](https://docs.stripe.com/testing?numbers-or-method-or-token=tokens)
4. Confirm the successful payment and resulting order in Stripe and the Prodigi sandbox dashboard. The sandbox accepts orders for testing but does not print or ship them.[Prodigi API environments](https://www.prodigi.com/print-api/docs/reference/)

The build and hosted Worker artifact validation passed. I did not run a live checkout or submit a Prodigi order.

## Gaps and next steps

- The star arrangement is a personalized, deterministic illustration based on the customer’s place and date; it is not a scientifically calculated historical sky map.
- Checkout currently offers US shipping only at **$34 with free shipping**. Sales tax is not calculated, and the price is not dynamically matched to Prodigi’s production and shipping costs.
- Before selling: add Stripe credentials and test checkout/webhooks; replace the Prodigi sandbox key with a live key; confirm live product availability and costs; and set production pricing, tax handling, and customer-facing policies. Prodigi’s live environment can produce and ship orders, unlike the sandbox.[Prodigi API environments](https://www.prodigi.com/print-api/docs/reference/)