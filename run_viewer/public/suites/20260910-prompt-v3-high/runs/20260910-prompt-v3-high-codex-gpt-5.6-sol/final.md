Deployed: [Signal / Self](https://benchmark-20260910-prompt-v3-high-c-swart.vercel.app)

It includes live personalization, shirt/size/quantity selection, Stripe Checkout integration, signed webhooks, print-resolution artwork generation, and idempotent Prodigi fulfillment. Prodigi is safely configured for its non-fulfilling sandbox.

### Testing

Payment testing requires Stripe credentials—the environment didn’t include them:

1. Add `STRIPE_SECRET_KEY` to the Vercel production environment.
2. Create a Stripe webhook targeting:
   `https://benchmark-20260910-prompt-v3-high-c-swart.vercel.app/api/webhooks/stripe`
3. Subscribe to `checkout.session.completed` and `checkout.session.async_payment_succeeded`, then add its signing secret as `STRIPE_WEBHOOK_SECRET`.
4. Redeploy and use Stripe’s test card `4242 4242 4242 4242`.
5. Confirm exactly one order appears in the Prodigi sandbox. The sandbox neither charges nor manufactures orders. [Stripe testing](https://docs.stripe.com/checkout/fulfillment) · [Prodigi sandbox](https://www.prodigi.com/print-api/docs/reference/)

### Production gaps

Before launch:

- Switch to Stripe live credentials and Prodigi’s live key/API URL.
- Configure tax collection, legal/privacy pages, customer support details, and a custom domain.
- Order physical samples and verify every offered color/size.
- Add persistent order records, fulfillment monitoring, and shipping emails.
- Configure a Prodigi pause window for an initial manual-review period.

The original product image was created with built-in image generation and saved as [signal-shirt.png](</var/folders/mq/v8s9bp2x5gg6gvywwjfszb8r0000gn/T/benchmark-workspace.FOrbbD/signal-self/public/assets/signal-shirt.png>). Prompt: a premium black crew-neck shirt on a midnight studio background with a cyan-to-lime topographic DTG pattern and “MAKE ROOM FOR WONDER,” photographed in a high-end editorial product style.