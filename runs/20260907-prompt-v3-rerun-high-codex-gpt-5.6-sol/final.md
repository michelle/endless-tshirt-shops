Deployed: [Fieldmark t-shirt store](https://benchmark-20260907-prompt-v3-rerun-lime.vercel.app)

It includes live personalized topographic artwork, size/ink/quantity controls, responsive design, Stripe Checkout integration, signed print-ready 4680×5790 PNG generation, and payment-gated Prodigi fulfillment with idempotency protection.

### Testing

- Customize the location, coordinates, date, message, palette, and size.
- Verify the live print preview updates.
- Checkout currently reports that Stripe is not configured because no Stripe credentials were available.
- To test payments, add `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` to the Vercel project, then register:

  `https://benchmark-20260907-prompt-v3-rerun-lime.vercel.app/api/stripe/webhook`

  for `checkout.session.completed` and `checkout.session.async_payment_succeeded`.
- Redeploy and pay using Stripe’s test card `4242 4242 4242 4242`. The paid order should then appear in Prodigi’s sandbox. Stripe fulfillment is driven by the signed webhook—not the success page—as recommended by [Stripe](https://docs.stripe.com/checkout/fulfillment). Prodigi’s sandbox does not charge or manufacture orders. [Prodigi API documentation](https://www.prodigi.com/print-api/docs/reference/)

### Known gaps before production

- Add Stripe test credentials to complete end-to-end testing.
- After ordering physical samples, switch the Prodigi endpoint and key from sandbox to live.
- Configure live Stripe keys, webhook, taxes, refunds, and destination-specific shipping economics.
- Add customer email, tracking, privacy, terms, returns, and support workflows.
- Perform trademark/domain clearance for “Fieldmark.”
- Validate every offered size/country combination and final print placement with samples.

The generated campaign asset is saved at [field-notes-lifestyle.png](</var/folders/mq/v8s9bp2x5gg6gvywwjfszb8r0000gn/T/benchmark-workspace.OY3r6n/field-notes-store/public/field-notes-lifestyle.png>). It was created with the built-in image generator using a premium coastal fashion-photo brief featuring a black DTG topographic shirt.