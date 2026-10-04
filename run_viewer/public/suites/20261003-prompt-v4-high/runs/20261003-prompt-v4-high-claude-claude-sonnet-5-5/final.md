The store, Overhead, is live and a test order has gone through the whole flow: pay, webhook, Prodigi sandbox order. It's on a temporary Vercel URL that expires about 40 minutes after I finished, so claim it first.

**Live site:** https://temporary-speedy-topaz-xrdtqhb.vercel.app

**Claim links, do both soon:**
- **Vercel (expires within about an hour):** https://vercel.com/claim-deployment?code=3db73746-0a00-492e-a20f-608f52d3e1e4
- **Stripe sandbox (expires 2026-10-11):** https://dashboard.stripe.com/onboard_sandbox/YWNjdF8xVU1Yc29EeGRIOTBDQ1laLDE3OTE3MDExNzMv100h4mdqW41

## The product
Overhead tees print the real night sky for a date, time and place the customer picks. They also choose a headline, a personal line, shirt colour (6) and ink (filtered for contrast), constellation lines on or off, and size. The price is $36 plus shipping. Shipping comes from a live Prodigi quote, and the customer sees it in the cart before paying. The preview shows the design on a shirt before they pay. The Sun, Moon phase and planets are drawn too.

## How to test
1. Open the site, go to **Design yours**, change the details and add to cart.
2. In the cart pick a destination and click **Checkout securely**.
3. On Stripe use card `4242 4242 4242 4242`, any future expiry and any CVC. The page says it's a sandbox and no real payments are processed.
4. You land on `/order/...` with a progress timeline.

I ran this on the live site: payment, then Prodigi sandbox order `ord_1176916` for `GLOBAL-TEE-BC-3001`. The order references the print file at 4677×5881 transparent PNG, and I checked it looks right on a dark shirt. The same print URL returns 404 for an unpaid or made-up session.

Orders only go to Prodigi after Stripe confirms payment. The webhook triggers the send, with a fallback when the order page loads. Retries can't create duplicate orders.

## Known gaps
- **Sandbox only:** Prodigi's sandbox left the order at "NotYetDownloaded", so I haven't seen Prodigi fetch the print file. I also haven't seen a physical shirt, so print placement and size on a real tee are unverified.
- **No receipt emails, order database or admin.** Stripe is the only record of orders. If sending to Prodigi fails permanently, it's logged and written to the session metadata, but nothing alerts you or refunds the customer.
- **No sales tax or VAT** is configured.
- **Cities:** only places of about 5,000 people or more are searchable, with no custom coordinates.
- **`/api/mockup` is public** with no rate limit, so someone could use it to burn server time.
- **Legal pages** (shipping and returns, privacy, terms) are placeholders and have no contact email.
- **Deploy workaround:** the Vercel deploy only worked after I uploaded `node_modules` and deleted the macOS sharp binaries. They're backed up in `/tmp/imgbak`, and I restored them for local runs.
- **Secrets file:** `.env.local` is moved to `/tmp/overhead.env.local` so a deploy doesn't upload it. `store/.env.example` lists the variable names.
- **Dependencies:** I didn't review the `npm audit` findings.

## To go to production
1. Claim the Vercel project and add a real domain. Set `SITE_URL` to it.
2. Switch Stripe to live keys and create a live webhook for `checkout.session.completed` and `checkout.session.async_payment_succeeded`, pointing at `/api/webhooks/stripe`. Set `STRIPE_WEBHOOK_SECRET`. Turn on Stripe Tax if you need it.
3. Get a Prodigi production API key and set `PRODIGI_API_KEY` and `PRODIGI_BASE_URL=https://api.prodigi.com/v4.0`.
4. Order a real sample shirt and check where the print sits and how big it is. Adjust the print-area handling if needed.
5. Add receipt emails and a failure alert, write the real legal text, and add rate limiting on the preview endpoint.
