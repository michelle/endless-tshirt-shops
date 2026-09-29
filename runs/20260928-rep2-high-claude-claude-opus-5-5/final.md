The store is live at **https://benchmark-20260928-rep2-high-claude.vercel.app**. I ran two complete purchases through it: in both, a test card payment succeeded and the order reached the Prodigi sandbox.

## What it sells: "Overhead", custom star-map tees
The customer picks a place (any town on Earth) and a local date and time, like a first date, a birth or a proposal. The site calculates the real sky overhead at that minute: about 1,300 visible stars, constellations, the Moon with its actual phase, and any planets that were up. It adds their own title and a line of text, and prints the result on a Bella+Canvas 3001 tee in one of 5 colours. No two shirts are the same, which suits DTG well.

- **Preview matches the print:** the browser preview and the file Prodigi prints come from the same code.
- **Print file:** a 4680×5790 PNG with a transparent background. There is no semi-transparent ink, because that prints badly on dark shirts.
- **Price:** $38 per shirt, plus $8 standard or $35 express shipping. Prodigi's sandbox cost was about $11–16 per shirt plus $5–33 shipping.

**Payment is Stripe Checkout.** A shirt only goes to Prodigi after the Stripe webhook arrives and the server has confirmed with Stripe that the order is paid. Each Stripe checkout can create at most one Prodigi order, and a repeated webhook was confirmed to create no duplicate. There's no database: the design is stored on the Stripe order. The order page also retries the submission in case the webhook is late.

## How to test it
1. Open `/design`, search for a place, set the date and time, add your text, pick a colour and a size, then click Checkout.
2. Pay with card `4242 4242 4242 4242`, any future expiry and any CVC. Use a new email each time; otherwise Stripe Link asks for a verification code.
3. You land on `/order/cs_test_…`, which should show "Paid" and a Prodigi order ID. My two test orders are `ord_1175122` and `ord_1175123` in the Prodigi sandbox dashboard. Prodigi reported downloading the print file for `ord_1175122`.

**Claim the Stripe sandbox before Oct 6, 2026, or it expires and checkout stops working:** https://dashboard.stripe.com/onboard_sandbox/YWNjdF8xVUtnUFNJb0JXWlBuMjRVLDE3OTEyNDcxNDIv100nXyckQEj
- No Stripe keys were available, so I created this sandbox with the Stripe command-line tool and registered it to your email (analogmidnight@gmail.com) so you can claim it.
- Its test key was printed into my session log. Rotate it after you claim the sandbox.

## Known gaps
- **No tax:** sales tax and VAT aren't collected.
- **No customer emails:** there's no order confirmation or shipping email; test-mode Stripe doesn't send receipts. Tracking only shows on the order page.
- **No admin view:** Stripe and the Prodigi dashboard are the only record of orders. Refunds and cancellations are manual, in both systems.
- **Latin text only:** the fonts cover Latin characters only, and other scripts are rejected. There's no cart; each checkout is one design in one size, though quantity can be changed.
- **Place search licence:** place search uses Open-Meteo's free geocoding service, which is for non-commercial use only. Production needs their paid plan or another geocoding provider.
- **Mockup:** the shirt preview is a drawing, not a photo mockup.
- **Colours:** I dropped the "natural" colour because Prodigi's sandbox quoted no express shipping to the US for it.

## To go to production
1. Claim the Stripe sandbox, activate a live account, and set the live `STRIPE_SECRET_KEY` in Vercel.
2. Create a live webhook for `https://<domain>/api/webhooks/stripe` with the events `checkout.session.completed` and `checkout.session.async_payment_succeeded`, then set `STRIPE_WEBHOOK_SECRET`.
3. Set Prodigi's live `PRODIGI_API_KEY`, set `PRODIGI_API_URL=https://api.prodigi.com/v4.0`, and add billing in Prodigi.
4. Add a custom domain and set `SITE_URL` to it. Prodigi downloads the artwork from there, so it must not be behind Vercel's deployment protection. Don't change `ORDER_SIGNING_SECRET` while orders are open, or Prodigi can't download their artwork.
5. Turn on Stripe Tax and customer receipt emails, and add terms, privacy and returns pages.
6. Order a physical test print of a dark and a light shirt to check small-star legibility and colours, then adjust prices using live Prodigi quotes.

The README covers how it works and the environment variables. Separately, your Gmail, Google Calendar and Google Drive connectors need authorising in claude.ai connector settings before I can use them; this task didn't need them.
