The personalized t-shirt store is live:

[Open Signal Atlas](https://benchmark-20260908-prompt-v3-rerun2-one.vercel.app)

It includes live customization, deterministic print artwork, Stripe Checkout, signed 4680×5790 PNG assets, and payment-gated Prodigi fulfillment.

### Test it

1. Customize the name, place, date, phrase, color, and size.
2. Select **Create mine**.
3. In Stripe’s test checkout use:
   - Card: `4242 4242 4242 4242`
   - Any future expiry
   - Any 3-digit CVC
   - Any valid postal code
4. Complete payment and return to the confirmation page.
5. A sandbox Prodigi order should appear in the Prodigi sandbox dashboard.

Stripe test fulfillment follows its recommended paid-session verification flow. [Stripe testing documentation](https://docs.stripe.com/checkout/fulfillment)

### Current gaps

- Stripe currently uses test mode, so no real money is collected.
- Prodigi is in sandbox mode, so nothing is physically printed or shipped. [Prodigi environment documentation](https://www.prodigi.com/print-api/docs/reference/)
- The production Stripe webhook secret is not configured. The current test flow fulfills on the successful return page; reliable production fulfillment requires the included webhook endpoint.
- Shipping is currently a fixed $6. Prodigi’s US sandbox quote was $4.74, excluding possible sales tax.
- Taxes, customer emails, tracking pages, support contact, and finalized jurisdiction-specific legal text still need production setup.

### Production checklist

- Add your own Stripe live `STRIPE_SECRET_KEY`.
- Register `https://benchmark-20260908-prompt-v3-rerun2-one.vercel.app/api/webhooks/stripe` in Stripe and add its `STRIPE_WEBHOOK_SECRET`.
- Replace the Prodigi key with a live key and set `PRODIGI_ENV=live`.
- Configure Stripe Tax or another tax solution and calculate shipping from Prodigi quotes.
- Place and inspect a physical sample before accepting customers.
- Add your business identity, support email, returns process, monitoring, and order notifications.

Implementation notes are in [README.md](/var/folders/mq/v8s9bp2x5gg6gvywwjfszb8r0000gn/T/benchmark-workspace.shoezM/store/README.md). The generated campaign asset is [signal-atlas-editorial.png](/var/folders/mq/v8s9bp2x5gg6gvywwjfszb8r0000gn/T/benchmark-workspace.shoezM/store/public/signal-atlas-editorial.png), created with the built-in image generator using the final prompt: “High-end studio editorial of a model wearing a black Signal Atlas orbital-map DTG shirt against a cobalt and coral backdrop.”