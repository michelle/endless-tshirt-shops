The store is built and works end to end, but it is not deployed to a permanent URL, and real Stripe payments have never been run.

**Why there is no permanent URL.** Every deploy route I could use without an account login was either retired or static-only. Vercel's anonymous endpoint is retired, and Netlify's anonymous mode refuses server functions. I also didn't use credentials I found in your home directory (`~/.tshirt-secrets`, `~/.scratch-stripe`, `~/.config/stripe`) to deploy. A temporary public tunnel is running at https://handy-packing-believes-funeral.trycloudflare.com. It runs from this machine and disappears when I stop it or this machine sleeps.

**The store: Skyprint.** Each customer picks an occasion, a place and a date and time. The store calculates the real sky for that moment, including stars, constellations, planets and moon phase. It prints that sky on a shirt with the headline, place, date, coordinates and a personal line. There are 7 shirt colors, ink themes matched to light or dark shirts, and 12 shipping countries. Shirts cost $38, or $41 in 2XL and 3XL, plus flat shipping per country. The print file is full print-area size, on a transparent background, with inks chosen so they print well on the fabric.

**How to test**
- **On the tunnel:** open the URL above, design a shirt, click "Continue to test checkout" and fill in the form. You get a success page with a real Prodigi sandbox order. Three test orders went through (`ord_1177893` to `ord_1177895`, all InProgress with no issues). This is a sandbox demo mode: no money moves and nothing ships. It turns itself off if the Prodigi key isn't a `test_` key.
- **Locally:** run `npm i`, then `PRODIGI_API_KEY=… npm run build && npm start`. `npm test` runs 6 tests that check shirts are only sent to Prodigi after Stripe reports a paid session. `GET /api/health` shows what is configured.

**Known gaps**
- **Stripe is untested against the real Stripe API.** The code is written for Stripe Checkout with a webhook, but only a fake client has exercised it. The Prodigi order is created only after the session is paid.
- **No permanent deployment.**
- **Print quality is unconfirmed on a physical shirt.** The sandbox doesn't print.
- **Not built:**
  - tax or VAT
  - order-confirmation or tracking emails (customers only get Stripe receipts)
  - Prodigi status updates
  - a database or order history
  - rate limiting
  - legal review of the policies page
- **Prices and shipping are static.** Check the margins against Prodigi's live prices.
- **The shirt mockup on the site is illustrative.**

**To reach production**
1. Deploy to your own Vercel or Netlify account. The README has the steps, using `vercel login` then `vercel --prod`.
2. Create a Stripe account and start with test keys.
3. Set these environment variables: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `PRODIGI_API_KEY`, `SITE_URL` (your https origin) and `SIGNING_SECRET` (a random string).
4. Add a Stripe webhook at `/api/webhook` for `checkout.session.completed` and `checkout.session.async_payment_succeeded`.
5. Run a Stripe test payment, then confirm the Prodigi order is created.
6. Switch to a live Prodigi key and fund the account. Order one real shirt to check the print.
7. Add tax and emails, and have the policies reviewed.

I recommend rotating the sandbox Prodigi key. It was bundled into a temporary staging copy during my deploy attempts. I deleted that copy and the other temp files I created.
