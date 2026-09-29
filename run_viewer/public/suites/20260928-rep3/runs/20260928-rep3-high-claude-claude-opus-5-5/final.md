I built and deployed the store, and a real test purchase went all the way from payment to a Prodigi order.

**Live store:** https://benchmark-20260928-rep3-high-claude.vercel.app (Vercel project `benchmark-20260928-rep3-high-claude-claude-opus-5-5`)

## The concept: Overhead, "Wear the sky from the night it happened"
The customer picks a date, a local time and a place (any town, via a search box), and adds a title and a line of their own. The site works out the real sky above that spot at that minute and prints it on the shirt: about 2,300 stars, constellation lines, the moon in its correct phase, and whichever planets were up. They choose the shirt colour (7 options) and an ink style (4 options), and can switch constellation names and a grid on or off. The preview updates as they type, and it's drawn by the same code that makes the print file, so what they see is what gets printed. Since each shirt is printed one at a time (DTG), every one can be different.

## Payment and fulfilment
- **Stripe Checkout.** I created a Stripe sandbox with your email so you can claim it. Prices are set on the server, not taken from the browser: $38 per tee plus $7.95 flat shipping, to 22 countries.
- **Shirts go to Prodigi only after payment.** A signed Stripe webhook sends the order only once Stripe marks it paid, including slower payment methods that clear later. Webhook retries and the order page's backup check can't create duplicate orders.
- **Print file.** Each order gets a full-size, transparent 4680×5790 PNG at a signed link that Prodigi downloads. Links that have been tampered with are refused.

## What I tested on the live site
- A headless browser designed a shirt, added it to the bag and paid with the 4242 test card.
- The Stripe webhook returned 200 and created Prodigi order `ord_1175192`, and Prodigi downloaded the print file. Colour, size, address and phone number were all correct. I left that sandbox order in place so you can see it.
- Bad webhook signatures, an invalid size, an invalid time zone, an empty bag, an unpaid checkout and an unknown order ID are all handled correctly.
- I checked the layout on desktop and mobile.

## How you can test it
1. Open **/design**, search a place, set a date and time, and change the words and colours.
2. Add it to the bag and check out with card `4242 4242 4242 4242`, any future expiry date and any CVC.
3. You'll land on `/order/cs_test_…`, which shows Paid → Sent to print along with the Prodigi order ID. You can also look the order up in the Prodigi sandbox dashboard.
4. `scripts/e2e-checkout.mjs` repeats this whole flow automatically.

## Known gaps
- **The Stripe sandbox expires on 2026-10-06.** Claim it before then: https://dashboard.stripe.com/onboard_sandbox/YWNjdF8xVUtwSDdMOGpwV0F0c0J3LDE3OTEyODAwNzMv1005uY3ARZm
- No sales tax or VAT is collected. Prodigi's quotes also leave out US sales tax.
- The store sends no emails of its own: no order confirmation and no shipping notice. It relies on Stripe's receipts, which only go out once you turn them on in live mode. The order page does show live print and tracking status.
- There's no database or admin screen. Orders live in Stripe and Prodigi, and Prodigi's status updates are only written to the logs.
- There's no rate limiting on the checkout and image endpoints.
- Place search uses Open-Meteo's free service, which covers towns but not street addresses. Customers can type exact coordinates instead.
- Shipping is one flat rate. Canada costs about $19 to ship, so margins there are thin, and there's no express option.
- I haven't seen a physical print yet.
- Returns, privacy and terms pages don't exist yet.

## What you need to do for production
1. Claim the Stripe sandbox (or use your own account), finish account activation, and put the live key into `STRIPE_SECRET_KEY`.
2. Create a live webhook at `/api/stripe/webhook` for the three `checkout.session.*` events and put its signing secret into `STRIPE_WEBHOOK_SECRET`.
3. Switch Prodigi to live: set a live `PRODIGI_API_KEY`, set `PRODIGI_API_URL=https://api.prodigi.com/v4.0`, and add billing in Prodigi.
4. Set `NEXT_PUBLIC_TEST_MODE` to empty so the test-card hint disappears, and set `SITE_URL` to your custom domain.
5. Turn on Stripe Tax (or register for tax yourself), receipts and branding.
6. Order a couple of physical samples, a dark shirt and a light one, to check ink density and fine detail.
7. Add legal and returns pages, confirmation emails, and rate limiting (e.g. Vercel WAF).

Don't change `ART_SIGNING_SECRET` while orders are still being printed: it would break the print-file links Prodigi already has. The code is committed locally in `overhead/`, and the README lists every environment variable.
