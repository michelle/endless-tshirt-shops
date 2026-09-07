The rebuild is live and verified with real browser purchases against production.

**Live site:** https://benchmark-20260906-minimal-inspecto-five.vercel.app (Vercel project `benchmark-20260906-minimal-inspector-high-claude-claude-fable-5-1`)

**What I built**

- Next.js 16 app in the workspace, mirroring the original: live-ticking timestamp on a black tee, Fitted/Unisex and S–XL pickers, $30 struck to $22.50, "Congrats on your pretty cool shirt!" success screen.
- Pressing Buy freezes the millisecond timestamp. That number is the design and is stored on the Stripe PaymentIntent, which serves as the order record. There is no database.
- Payments use Stripe Elements: Express Checkout (Link, Klarna, Amazon Pay, Google Pay where available) plus a card form with Address Element.
- Fulfillment is Prodigi. The `payment_intent.succeeded` webhook creates the order, and the browser's poll on `/api/order` does the same if the webhook is slow. Both are idempotent via Prodigi's idempotency key, and I verified the race resolves to a single order.
- Print artwork is rendered on demand at `/api/artwork/<timestamp>.png` as a 2490x3510 transparent PNG in Chivo, sized to the tees' US front print area. Prodigi downloads it from there.
- SKUs: Fitted is Bella+Canvas 6004, Unisex is Bella+Canvas 3001, both black.

**How to test**

1. Open the site, pick a cut and size, click "Or enter details manually" if wallet buttons appear.
2. Enter any email, a US address, and card `4242 4242 4242 4242` with any future expiry and CVC.
3. The success screen shows the shirt's timestamp and a Prodigi order id like `ord_1170778`. Check it with:

```
curl -H "X-API-Key: $PRODIGI_API_KEY" https://api.sandbox.prodigi.com/v4.0/orders/<id>
```

4. Every PaymentIntent in Stripe carries `style`, `size`, `timestamp`, and `prodigi_order_id` in metadata, or `fulfillment_error` if Prodigi rejected it.
5. Optionally run the scripted purchase in the repo's `e2e/buy.mjs` with Playwright.

**Known gaps**

- The Stripe account is a claimable sandbox I provisioned with the CLI. It expires 2026-09-14 unless you claim it at the URL stored in the benchmark Stripe config under `sandbox_claim_url`. Its key is restricted, which is why shipping is attached client-side at confirm time.
- Test mode sends no email receipts, and Apple Pay needs domain registration in the Stripe dashboard before it appears.
- The Prodigi sandbox never downloads assets or prints, so garment placement of the artwork has only been checked by eye on the PNG, not by Prodigi.
- Shipping is US only with free shipping baked into the $22.50 price. Prodigi's US cost is about $18 per shirt including shipping, so margin is thin. No sales tax is collected.
- Klarna and Amazon Pay show because the sandbox enables them by default. Disable them in the Stripe dashboard if you want a tighter checkout.
- Automated coverage is unit tests for validation and catalog logic plus the Playwright script. There is no CI.

**What you need to do next**

- Claim the Stripe sandbox, or replace the keys in the Vercel project's environment with your own and recreate the webhook endpoint pointing at `/api/stripe/webhook`.
- For real orders, switch `PRODIGI_API_URL` to the live Prodigi endpoint with a live key, use live Stripe keys, and place one real test order to confirm print placement.
- If you want a custom domain, add it in Vercel and set `PUBLIC_BASE_URL` to it so Prodigi fetches artwork from the right host.
