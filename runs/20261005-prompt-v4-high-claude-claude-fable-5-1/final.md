The store is built, deployed, and verified end to end. Here is the handoff.

## Dayprint is live

**Store:** https://temporary-prompt-dune-kmyguub.vercel.app
**Claim it (do this first):** https://vercel.com/claim-deployment?code=101fea52-9c61-4205-a128-94fee0634527

The deployment is an anonymous Vercel deployment because no hosting credentials were available in this environment. It **expires at 01:41 UTC on 6 Oct 2026** (about 60 minutes after I created it) unless you click the claim link, which moves it into your Vercel account permanently. If it has already expired when you read this, run `npm run deploy -- --fresh` in the project folder. That command creates a new URL and rewires the Stripe webhook automatically. All URLs and IDs are also in `DEPLOYMENT.md`.

## The concept

**Dayprint: the weather of one day in your life, on a shirt.** The customer enters a place and a date (any day since 1940). The store pulls that day's real hourly weather from the ERA5 climate archive and renders a 24-hour radial print: each hour's sky colour (night, dawn, day, dusk, shaded by cloud, darkened by rain, lightened by snow), wedge length for temperature, dotted sunrise and sunset lines, rain ticks and snow dots, the real moon phase, and a caption like "The day you were born" set in italic serif with the place, coordinates, high and low, daylight hours and a plain-language summary. It only makes sense with DTG: every shirt is full colour and generated from the customer's own data. Seven garment colours, XS to 3XL, with the palette pre-blended so every pixel of ink is opaque (translucent gradients print muddy on DTG).

## How to test it

1. Open the store, type a city, pick a date at least a week old, add a caption, choose a colour and size. The shirt mockup updates live.
2. Click **Buy this shirt**. Stripe Checkout opens. Use card `4242 4242 4242 4242`, any future expiry, any CVC, any address.
3. You land on a confirmation page that shows the payment, the Prodigi sandbox order ID, and a link to the exact 4680×5790 print file sent to the printer.

I ran this exact flow headlessly three times against the live deployment. In the last run the Stripe webhook created the Prodigi order 23 seconds after the session was created, before the customer even reached the confirmation page, and Prodigi reported `downloadAssets: Complete` for an earlier order, which confirms it fetched the print file from the live artwork endpoint.

## Payment and fulfilment design

- Stripe Checkout (hosted) collects payment, shipping address and phone. The design is stored in session and PaymentIntent metadata.
- Nothing reaches Prodigi until `payment_status` is `paid`. The webhook does the fulfilment. The confirmation page also triggers it as a fallback, so an order still goes to print if the webhook is delayed.
- Fulfilment is idempotent twice over: the Prodigi order ID is recorded on the PaymentIntent and checked first, and Prodigi's own `idempotencyKey` is the Checkout session ID (verified: a duplicate POST returns `AlreadyExists` with the same order).
- Prodigi downloads the artwork from an HMAC-signed, deterministic URL, so there is no file storage to run and links cannot be forged. Tampered signatures return 403.

## Known gaps

- **Stripe account is a claimable sandbox** that I provisioned with `stripe sandbox create` using your email. Claim it before 13 Oct 2026 at the link in `DEPLOYMENT.md` or the keys stop working. It is test mode only.
- **Prodigi is sandbox.** Orders are not printed. Switching to live is one env var plus your live key.
- **No order database.** Stripe is the system of record (search PaymentIntent metadata for `prodigi_order_id`). Fine for launch, but there is no admin list, no shipping-status sync back to customers, and no email beyond Stripe's receipt.
- **Weather source is free tier.** Open-Meteo's free API is for non-commercial use. Production needs their paid plan (or a direct ERA5 pipeline), and the archive lags about a week, so the newest selectable date is seven days ago.
- **Flat $7.95 worldwide shipping** to 35 countries. Prodigi's real cost is about $4.60 US and $5.70 UK, so it is covered, but you may want country-specific rates.
- **Pricing is a guess:** $36 shirt. Prodigi's landed sandbox cost is about $16.50, giving roughly a 55% gross margin.
- No returns, taxes (Stripe Tax is off), or terms pages. Stripe sandbox restricted keys cannot enable Stripe Tax.

## To bring it to production

1. Claim the Vercel deployment, then move the env vars from the deploy command into the Vercel project settings.
2. Claim the Stripe sandbox, create a real Stripe account, swap in live keys, and recreate the webhook endpoint for the final domain (the deploy script does this given live keys).
3. Replace `PRODIGI_API_BASE` with `https://api.prodigi.com/v4.0` and your live Prodigi key. Order one physical sample first and check the print against the mockup.
4. Put a custom domain on it and set `PUBLIC_BASE_URL` so artwork URLs stay stable across deployments.
5. Subscribe to Open-Meteo's commercial plan.
6. Decide pricing, shipping tiers, tax and refund policy, and write the terms page.

The project is in the working directory with a README, unit tests (`npm test`, 11 passing), a local dev server, and the headless end-to-end script (`scripts/e2e.mjs`) you can point at any deployment.
