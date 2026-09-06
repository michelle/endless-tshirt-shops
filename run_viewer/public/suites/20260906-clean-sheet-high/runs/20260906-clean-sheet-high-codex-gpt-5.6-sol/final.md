The store is live: [STATUS/WEAR](https://benchmark-20260906-clean-sheet-high-lovat.vercel.app)

It includes responsive product pages, three original shirt designs, Stripe-hosted checkout, an active Stripe webhook, and automatic Prodigi sandbox order creation with duplicate protection.

### Test it

1. Select a size and click **BUY — $32**.
2. Use Stripe’s test card `4242 4242 4242 4242`, any future expiry, and any CVC. [Stripe test-card documentation](https://docs.stripe.com/testing?locale=en-GB&testing-method=tokens)
3. Enter a valid shipping address.
4. After payment, the confirmation page should display the Prodigi sandbox order ID.

No money is charged and nothing is manufactured because fulfillment uses Prodigi’s sandbox. [Prodigi sandbox documentation](https://www.prodigi.com/faq/print-api/)

### Known gaps and next steps

- Claim the temporary Stripe sandbox before **September 13, 2026** by running `stripe sandbox claim`. Then replace the temporary Vercel Stripe key with your permanent test/live key.
- The current $32 price absorbs shipping and does not calculate tax. Add Prodigi quote-based shipping and tax handling before launch.
- Product images are AI-generated mockups; order samples and replace them with real photography before selling.
- Going live requires switching the hardcoded Prodigi sandbox endpoint to the live API, adding live keys/webhook, and publishing shipping, returns, privacy, and terms pages.
- Checkout currently supports one shirt per order rather than a multi-item cart.

The generated catalog assets are in `public/products/*.png`; the production print files are in `public/prints/*.png`. The mockup prompts specified front-facing black, natural, and orange heavyweight tees with the exact “200 OK,” “404 OFFLINE,” and “418 TEAPOT” artwork, generated using the built-in image tool.