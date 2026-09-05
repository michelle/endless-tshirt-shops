The rebuild is deployed and verified end to end, including a real headless-browser purchase on production that produced a Prodigi sandbox order.

**Live site:** https://benchmark-20260905-minimal-high-cla.vercel.app (Vercel project `benchmark-20260905-minimal-high-claude-claude-fable-5-1`; the alias is truncated because the project name is long).

**What was built**

- Next.js 15 app in the workspace, committed to a local git repo. The shirt SVG ticks with the Unix millisecond time and freezes the moment you press Buy now.
- Stripe Elements checkout with Address Element, email, Payment Element, and an Express Checkout Element for Apple Pay, Google Pay and Link. The PaymentIntent is the system of record. There is no database.
- Prodigi replaces Scalable Press. Fitted maps to `GLOBAL-TEE-BC-6004` and Unisex to `GLOBAL-TEE-BC-3001`, both black, sizes S to XL. Both SKUs were verified against the sandbox catalogue.
- Fulfilment runs from two idempotent paths: the browser calls finalize right after payment, and the Stripe webhook covers closed tabs. Both use the PaymentIntent id as the Prodigi idempotency key. In testing they raced and Prodigi correctly returned one order.
- Artwork is rendered on demand at `/api/artwork/<timestamp>.png` as a transparent 3120x3860 PNG with the timestamp in white Chivo, 8 inches wide and 3 inches from the top, matching the original print spec. Prodigi confirmed it downloaded the asset.
- An order status page at `/order?payment_intent=pi_...` shows payment state, Prodigi stage, tracking and the print file.

**How to test**

1. Open the site, pick a style and size, fill a US address, an email, and card `4242 4242 4242 4242` with any future expiry and CVC. Press Buy now.
2. The success panel shows the frozen timestamp, the PaymentIntent id and the Prodigi order id.
3. Check the PaymentIntent in Stripe and the order in the Prodigi sandbox dashboard. Two orders from my tests exist already: ord_1170550 and ord_1170551.
4. Run `npm test` and `npm run build` locally. Keys are in `.env.local`.

**Known gaps**

- The Stripe account is an unclaimed sandbox I provisioned with `stripe sandbox create` under your email. It expires 2026-09-12 unless you claim it at the claim URL saved in your Stripe CLI config, or run `stripe sandbox claim`.
- Stripe does not send email receipts in test mode, and there is no custom confirmation email or tracking email. Prodigi does not email customers.
- Apple Pay needs domain registration in the Stripe dashboard before its button appears. Link, Google Pay and cards work now.
- Shipping is limited to US addresses. Sales tax is not collected.
- Artwork is 200 dpi, below Prodigi's 300 dpi recommendation. Raising it would double the render cost of the serverless function.
- Prodigi orders are placed immediately on payment with no review window or cancellation flow, and there is no admin view beyond Stripe and Prodigi dashboards.
- In headless Chromium the Express Checkout area reserved space for a Link button that did not paint. I could not verify how it looks in a real browser.

**What you need to do next**

- Claim the Stripe sandbox, or replace the keys on Vercel with your own test keys and create a webhook for `/api/webhooks/stripe` with the two `payment_intent` events.
- To go live: switch `PRODIGI_API_BASE` to the live endpoint with a live key, use live Stripe keys and a live webhook, set `SITE_URL` to your domain, and register the domain for Apple Pay.
- Decide whether to add order emails, a custom domain, and a tax solution.
