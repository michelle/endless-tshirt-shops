The store is built, deployed and tested end to end. The deployment is temporary, though: **it expires at about 1:29 AM PDT tonight (about 55 minutes from now) unless you claim it.** The Vercel CLI here was logged out, so an anonymous, claimable deploy was the only way to publish with server functions.

- **Store:** https://temporary-nimble-celesta-y0pf2c6.vercel.app
- **Claim it now to keep it:** https://vercel.com/claim-deployment?code=633b828d-562f-4384-ae32-f4157b6c2164

## The concept: Overhead
Each shirt is printed with the exact night sky above a place and moment the customer picks, such as where they were born or where they met. The chart shows about 2,300 real stars, the constellation lines, the planets, and the Moon in its true phase and orientation. Below it go the customer's headline, place, date and coordinates. They also choose the shirt colour (6 options), the ink, and which labels to show, with a live preview.

## What I checked
- **Payment:** Stripe Checkout, which collects the shipping address. Prodigi only gets the order after Stripe reports the payment as paid.
- **Fulfilment:** the Stripe webhook triggers it, and the success page also triggers it as a backup. Duplicate calls return the same Prodigi order. Forged webhooks and unpaid sessions are rejected.
- **Full purchases on the live site:** a navy shirt to London (Prodigi order `ord_1178000`, which downloaded the print file) and a white shirt to Austin (`ord_1178002`). Both had the correct address, colour and size.
- **Print file:** a 4680×5790 px, 300 DPI PNG with a transparent background. It uses solid inks only, nothing thinner than about 0.6 mm, and labels leave a gap in the stars behind them instead of printing on top. Light ink goes on dark shirts and dark ink on light ones.
- **Accuracy:** spot checks match real skies, e.g. 20 March 2015 shows a new moon with Venus, Mars and Jupiter up.

## How to test
1. Open the store and search for a place. Set a date and time, a headline and a shirt colour. The "Print file" and "Close-up" tabs show what will be printed.
2. Pick a size and country, then check out with card `4242 4242 4242 4242`, any future expiry and any CVC. Enter an address in the chosen country with a valid-format phone number.
3. The success page shows the Prodigi order ID. You can also see the order in Prodigi's sandbox dashboard. Nothing is actually printed in the sandbox.

## Known gaps
- **Temporary Stripe account:** I didn't use the Stripe keys left in your home folder, since you didn't give them to me. Instead I created a new anonymous Stripe sandbox, which is deleted on **Oct 13** unless you claim it: https://dashboard.stripe.com/onboard_sandbox/YWNjdF8xVU5SQ1Q1dndnVFdUMDVTLDE3OTE4NzUwODgv100zNiHY1et
- **No emails:** there are no order-confirmation or shipping-tracking emails, and Prodigi status updates aren't connected.
- **No sales tax or VAT** is collected (Stripe Tax isn't turned on). Prices are USD only.
- **No database or admin screen.** Orders live in the Stripe and Prodigi dashboards, and nothing alerts you if fulfilment keeps failing (Stripe retries the webhook for up to 3 days).
- **Print size varies:** some Prodigi print locations print a smaller area (A4) than others, so the design scales down there. No physical sample has been printed yet.
- **Place search** uses Open-Meteo, whose free tier is for non-commercial use only.
- **Other limits:** no rate limiting on the API, and only Latin characters are supported (other scripts are blocked with a clear message).

## To go to production
1. **Hosting:** claim the Vercel deployment, or run `vercel login` and deploy as described in the README. Add your domain and set the environment variables in the project settings, because the current ones only apply to this one deployment.
2. **Stripe:** claim the sandbox and activate the account. Then create a live webhook for `https://<domain>/api/stripe-webhook` and set the live keys. Also turn on email receipts and Stripe Tax.
3. **Prodigi:** switch to a live API key, set `PRODIGI_API_URL=https://api.prodigi.com/v4.0`, add billing, and order a sample in a dark and a light colour.
4. **Before launch:** generate a new `ART_SIGNING_SECRET`, add terms, privacy and returns pages and a support contact, and get a commercial geocoding plan.

The code is in `overhead/` in the workspace, with a README covering the architecture and environment variables. The secrets are in `~/.overhead-store-secrets/stripe.env` and `overhead/.env.local`, and neither is uploaded with deploys.
