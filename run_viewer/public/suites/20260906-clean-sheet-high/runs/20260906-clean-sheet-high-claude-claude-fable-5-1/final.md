The store is built, deployed, and verified end to end with a real test purchase that reached Prodigi.

**What it is:** status.tees, t-shirts printed with HTTP status codes for developers. 35 codes (200 OK, 404, 418 I'm a teapot, 503, and so on), three print designs (oversized code, raw HTTP response with headers, small pocket print), 10 shirt colours, sizes XS to 5XL. The preview on the product page and the 300dpi print file Prodigi receives are generated from the same SVG code, so what you see is what gets printed.

**Live URL:** https://benchmark-20260906-clean-sheet-high-fawn.vercel.app

**Stack:** Next.js 16 on Vercel, Stripe Checkout (hosted), Stripe webhook that places the Prodigi order, resvg for print rendering. No database. The Checkout Session holds the tee spec, the PaymentIntent holds the Prodigi order id, and Prodigi's idempotency key is the session id, so webhook retries cannot double order. Code is in the `store/` folder with a README.

**How to test it**
1. Open the URL, pick any code, choose design, colour, size, and click Buy.
2. On Stripe Checkout enter any email, any US address, any phone, and card `4242 4242 4242 4242` with any future expiry and CVC. Uncheck "Save my information" to skip Link.
3. You land on the order page, which shows payment status, then the Prodigi sandbox order id and stage within a few seconds.
4. Check the print file at `/print/418-big-white.png` (transparent 4665×5844 PNG) or the mockup at `/mockup/418-big-black.png`.
5. In Prodigi's sandbox dashboard you should see orders with the Stripe session id as the merchant reference. My verified test order was ord_1170711. There is also ord_1170710 from a direct payload validation.

**Known gaps**
- Stripe is a claimable sandbox I provisioned with `stripe sandbox create`. It expires on 2026-09-13 unless claimed. The key is restricted, which was enough for Checkout, PaymentIntents, and webhooks.
- Prodigi is sandbox only. Nothing ships. Switching to a live key would charge real money per order.
- Single item per checkout with a quantity, no cart. Flat shipping of $5.99 everywhere, no tax calculation.
- No customer emails beyond Stripe's receipt, and no admin view. Order status lives at `/order/<session id>`; Prodigi shipment webhooks are not wired, so tracking appears only when the order page polls Prodigi.
- Colours and print placement have not been checked on a physical sample. Ink is white on dark shirts and black on light ones.
- The `.vercel.app` project subdomain was shortened by Vercel to the `…-high-fawn` form. The webhook and print URLs use that domain.

**What you need to do next**
- Claim the Stripe sandbox before 2026-09-13 with `stripe sandbox claim`, or replace `STRIPE_SECRET_KEY` and the webhook with your own account's values.
- When ready for real orders, set `PRODIGI_API_URL` to production with a live Prodigi key, and swap in Stripe live keys plus a live webhook secret.
- Optionally add a custom domain to the Vercel project and set `SITE_URL` so print URLs use it.
