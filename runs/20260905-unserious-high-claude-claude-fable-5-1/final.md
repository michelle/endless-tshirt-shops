Deployed and verified end to end. Here is the summary.

**Live site:** https://benchmark-20260905-unserious-high-c-gamma.vercel.app (Vercel project `benchmark-20260905-unserious-high-claude-claude-fable-5-1`)

**What I built**

- Next.js 16 app on Vercel. One page: a black tee that ticks with the current Unix millisecond, Fitted or Unisex, sizes S to 2XL, $22.50 with free shipping. The copy is unserious throughout, including the FAQ, the footer, the 404, and a tab title that shows the current millisecond.
- Stripe Payment Element plus Express Checkout Element with a deferred PaymentIntent. Clicking Buy freezes the number, the server creates the intent with the amount computed server-side and the shirt details in metadata, then the browser confirms in-page.
- Fulfillment through Prodigi replaces Scalable Press. It runs from both the Stripe webhook and the order page, and is idempotent because the Prodigi idempotency key is the PaymentIntent id. The Prodigi order id is written back onto the PaymentIntent metadata, which serves as the only order store, so there is no database.
- The artwork is rendered on demand at `/api/artwork/<timestamp>.png` as a transparent PNG at Prodigi's full front print area. I measured it: the number lands 8.2 inches wide and 3.15 inches below the collar, centered, matching the original's placement.
- The order page shows the number, a paid, printing, shipped timeline with Prodigi status, and polls until the shirt ships. Access requires the client secret, so the URL is the ticket.

**How to test**

1. Open the site, pick a style and size, enter an email and a US address, and pay with card 4242 4242 4242 4242, any future expiry, any CVC. You land on the order page with your number and the Prodigi order id.
2. To exercise it without a browser, the README has a three-command flow using curl and the Stripe CLI. I ran it against production and it worked: the webhook created Prodigi sandbox order ord_1170596 before the order page was even opened.
3. Prodigi sandbox orders are visible via the API with the sandbox key. Stripe test payments are in the sandbox dashboard once you claim it.

**Known gaps**

- Apple Pay is not registered for the domain. The claimable sandbox key cannot access the Apple Pay domain endpoint. Google Pay and Link work through the Express Checkout Element where the browser supports them.
- Stripe does not send receipt emails in test mode, and Prodigi sends nothing from the sandbox, so buyers currently get no email. The order page is the only confirmation.
- No admin view. Orders live in Stripe metadata and Prodigi. Fulfillment failures are recorded on the PaymentIntent and shown on the order page, but nobody is paged.
- Prodigi's US quote is about $12.23 plus $4.76 shipping before sales tax, so the margin on $22.50 is thin, and free shipping to the other listed countries may lose money.
- The Prodigi callback route trusts only the order id and re-fetches, but it is unauthenticated.

**What you need to do next**

1. Claim the Stripe sandbox before it expires on 2026-09-13, either with `stripe sandbox claim` or the claim URL: https://dashboard.stripe.com/onboard_sandbox/YWNjdF8xVUNJQWdHbFcwUHRQdWc0LDE3ODkyNzUzNzcv100E4VHT8yp
2. For real orders, swap in live Stripe keys, a live Prodigi key, and set `PRODIGI_API_BASE` to the production API. Recreate the webhook endpoint in live mode and update `STRIPE_WEBHOOK_SECRET`.
3. Set `SUPPORT_EMAIL` on Vercel so the returns FAQ shows a real address, and point a custom domain at the project.
4. Optionally register the domain for Apple Pay from a full-access Stripe key and serve the association file under `.well-known`.

The code is committed locally in the workspace with a README covering the architecture, environment, local development, and the headless test flow.
