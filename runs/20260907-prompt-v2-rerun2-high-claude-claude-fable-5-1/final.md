The store is built, deployed, and verified end to end. Here is the summary.

**Live site:** https://benchmark-20260907-prompt-v2-rerun2-eta.vercel.app (Vercel project `benchmark-20260907-prompt-v2-rerun2-high-claude-claude-fable-5-1`)

**The theme: Department of Obsolete Futures.** Official-looking agency seals for futures that were promised and never arrived. Seven bureaus, each with an original seal drawn in code: Bureau of Jetpack Commuting, Lunar Hotel Concierge Service, Flying Car Traffic Division, Meal Pill Nutrition Board, Weather Control Authority, Household Robot Union Local 2001, and Undersea City Planning Commission. Each ships on a Bella+Canvas 3001 in four colours, XS to 3XL, at $28. The same SVG code renders the on-site mockups and the 300 DPI print files, so the preview matches the print.

**How to test it**
1. Open the site, pick a bureau, choose a colour and size, add to cart, and click "Checkout with Stripe".
2. On Stripe's page use card `4242 4242 4242 4242`, any future expiry, any CVC, any US address.
3. You land on a confirmation page with a Prodigi order number, and "Track this order" shows live status from the Prodigi sandbox.
4. Automated version: `npm run e2e -- https://benchmark-20260907-prompt-v2-rerun2-eta.vercel.app` in the `store` folder drives the whole flow through Chrome. I ran it against production and it passed. Sandbox orders ord_1170953 and ord_1170954 are the results; Prodigi successfully pulled the print PNG from the live site.

**How it's wired.** Checkout validates the cart server-side and creates a Stripe Checkout Session with shipping address, phone, and Standard/Express rates. After payment, both the Stripe webhook and the success page call the same fulfilment function, which creates the Prodigi order using the Stripe session id as Prodigi's idempotency key, so a payment can never produce two print orders. Webhooks that fail return 500 so Stripe retries. Stripe and Prodigi are the system of record; there is no database.

**Known gaps**
- No order confirmation email. Stripe only sends receipts if you enable it in the dashboard; there is no custom email.
- The order tracking page is public to anyone with the order id. It hides the street address and shows only name, city, country, items, and tracking.
- Tax is not collected. Prodigi's quotes also exclude US sales tax.
- Shipping is a flat $5.95 / $14.95 worldwide, not Prodigi's actual per-country cost, so margins vary by destination.
- Sandbox Prodigi orders never actually print or ship, so the "Shipped" and tracking states are untested with real data.
- The Stripe account is a claimable test sandbox I provisioned under your email. Its secret key expires 2026-12-07 and the sandbox itself expires 2026-09-14 unless claimed.
- The generated project is in git but nothing is committed.

**To go to production**
1. Claim the Stripe sandbox before 2026-09-14 at https://dashboard.stripe.com/onboard_sandbox/YWNjdF8xVUQ5R3NLMWxKZURzVWpBLDE3ODk0MjkyOTkv100dCtAOTTm, or attach a real Stripe account, then set a live secret key and create a live webhook for `/api/webhooks/stripe` listening to `checkout.session.completed`. Put the new signing secret in `STRIPE_WEBHOOK_SECRET`.
2. Get a live Prodigi key, set `PRODIGI_API_KEY`, and change `PRODIGI_API_URL` to `https://api.prodigi.com/v4.0`. The "test mode" footer notice disappears automatically.
3. Point a real domain at the project and set `NEXT_PUBLIC_SITE_URL` to it so Prodigi fetches print files from the final domain.
4. Enable Stripe Tax (or price tax in) and Stripe receipt emails in the dashboard.
5. Order one sample of each colour to check the print size and placement. The design prints 12 inches wide, starting about 1.8 inches below the top of the print area.
6. Commit the `store` folder to a repo and connect it to the Vercel project for automatic deploys. The README in that folder documents the env vars and scripts.
