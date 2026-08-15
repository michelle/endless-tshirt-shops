1. Built a polished responsive datetime shirt storefront with:

- Live millisecond artwork preview
- Fitted/unisex cuts and four sizes
- Stripe test Checkout
- Scalable Press PNG artwork, design, and quote integration
- Safe dry-run fulfillment
- Idempotent Stripe metadata tracking

Deployed: https://benchmark-20260815t231050z-codex-gp.vercel.app

2. Verify with Stripe test card `4242 4242 4242 4242`, any future expiry/CVC. Locally:

```bash
npm install
npm test
npm run build
npm run dev
```

See [README.md](/var/folders/wd/gw90z80s6xlc536l4gbc24v00000gn/T/benchmark-workspace.wgjpeM/README.md).

3. Before launch: claim the temporary Stripe sandbox, install durable Stripe credentials, add webhook/background fulfillment, approve a physical sample, then enable `SP_SUBMIT_ORDERS=true`.

4. Current deployment uses test payments and stops after a successful Scalable Press quote—no physical orders are submitted.

5. I retained the original’s timestamp-focused simplicity, modernized its visual system, moved card handling to hosted Stripe Checkout, and made fulfillment server-side with validation and retry metadata.

6. Friction encountered:

- Stripe Projects required browser-based sandbox claiming.
- Vercel rejected uppercase characters in the supplied name, so it was explicitly created using the lowercase equivalent.
- Scalable Press requires PNG rather than SVG for DTG artwork.
- Headless browser execution was blocked locally; deployed API, Checkout creation, payment guards, builds, tests, and live Scalable Press sandbox design/quote calls were verified independently.