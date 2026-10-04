The store is built, deployed and tested end to end, but **the live URL expires at 16:36 today (about an hour from now) unless you claim it.**

**Store:** https://temporary-swift-frost-lpjpk47.vercel.app

**Claim it first, before 16:36:**
1. **Vercel:** https://vercel.com/claim-deployment?code=f7a782bc-a9bf-46e8-ab71-f76825c5de33. I deployed without an account, and unclaimed deployments are deleted after 60 minutes.
2. **Stripe:** https://dashboard.stripe.com/onboard_sandbox/YWNjdF8xVU1jWkFQVm5lSUJka0V2LDE3OTE3NTcxNjYv100VWWBMVME. I created a test-mode Stripe sandbox under analogmidnight@gmail.com. It expires on Oct 11 unless claimed.

If the Vercel link lapses, `ENV_FILE=../parks.env parks/scripts/deploy-temporary.sh --fresh` creates a new URL and sets up the Stripe webhook again.

## The concept: Personal Parks Service
"Every person deserves a national park." Customers name a park after anyone or anything ("Maya's Backyard", "Grandpa Joe's Garage", "The Couch"). They pick a landscape (mountains, desert mesas, rocky coast, or lake and forest), one of 5 color palettes, the year it was "established" and a motto.

- **Every shirt is unique:** the ridgelines, mesas and coastline are generated from the park's name. Change one letter and the mountains move, and a "Re-survey" button rerolls the terrain.
- **Print file:** a 3600×4500 transparent PNG (12″×15″ at 300 DPI) in flat, solid colors with no transparency inside the badge. That prints cleanly with DTG on any shirt color, and the badge comes out about 11″ wide on the chest. The live preview is drawn from the same file.
- **Product:** Bella+Canvas 3001 in 8 colors, sizes S–3XL, shipping to 24 countries. It sells for $34 with free shipping; Prodigi charges about $16.51 delivered in the US.

## How payment and fulfillment work
- Stripe Checkout takes payment, and an order goes to Prodigi only after Stripe confirms it's paid.
- A Stripe webhook sends the order. The order page also sends it if the webhook hasn't arrived yet, so nothing is lost if one of them fails.
- An order can't be sent twice: the Stripe checkout ID is passed to Prodigi as a duplicate-prevention key. I tested replaying the same order and Prodigi returned the existing order instead of creating a new one.
- There's no database; Stripe stores the design with each order.

## What I verified on the live site
- **Full purchase:** a headless browser customized a shirt, paid with Stripe's test card, and reached the order page. That created Prodigi sandbox order `ord_1177251`.
- **Webhook:** Stripe shows it as delivered.
- **Print file:** Prodigi downloaded it successfully, and the live file is byte-for-byte identical to my local render.
- **Error cases:**
  - An unpaid order shows "Awaiting payment" and sends nothing to Prodigi.
  - Webhooks with a bad signature are rejected.
  - Print-file URLs without a valid signature are refused.
  - Characters the fonts can't print are rejected.
  - Unknown order links return a 404.

## How to test it
Open the store, design a park, and click **Establish my park**. At checkout, pick **Card** and pay with `4242 4242 4242 4242`, any future expiry date and any CVC. The order page will show a Prodigi lab order number.

## Known gaps
- **Secrets showed up in my tool output:** the Stripe sandbox key (my redaction pattern missed its prefix) and the anonymous Vercel deploy token. Rotate the Stripe key after you claim the sandbox.
- **Side effect on your Stripe CLI config:** a failed signup attempt rewrote `~/.config/stripe/oauth_pending.json`.
- **Prodigi sandbox key:** other orders on it are from earlier runs, not this store.
- **Badge size can vary:** some Prodigi labs use a smaller print area, where the badge would print at about 6–8″ instead of 11″. I'd order a physical sample before launch.
- **No sales tax.** Stripe Tax isn't enabled.
- **No emails:** customers get no confirmation or shipping emails from the store itself.
- **No admin view** beyond the Stripe and Prodigi dashboards.
- **Two-character minimum:** park names must be at least 2 characters.
- **Fixed price everywhere:** $34 including shipping in every country, so the margin is thinner internationally.
- **Font coverage:** names must use Latin characters.
- **Unofficial name:** "National Park" branding is parody; a trademark check would be prudent.
- **Not under version control:** the source is in `parks/`. I ran `git init` but committed nothing; the secrets live outside it, in `../parks.env`.

## Before going to production
1. Claim the Vercel project, or run `vercel login`, then `vercel link`. Use a custom domain.
2. Activate a live Stripe account and set the environment variables with `vercel env add`:
   - `STRIPE_SECRET_KEY` (live key)
   - `PRODIGI_API_KEY` (live key)
   - `PRODIGI_API_BASE=https://api.prodigi.com/v4.0`
   - `PRINT_SIGNING_SECRET` (a new random value)
   - `PUBLIC_BASE_URL` (your domain)
3. Point a live Stripe webhook at `/api/webhooks/stripe` for `checkout.session.completed` and `checkout.session.async_payment_succeeded`, add `STRIPE_WEBHOOK_SECRET`, then run `vercel --prod`.
4. Add billing details and a payment method in your Prodigi account.
5. Order a few physical samples, including a dark shirt, to check print size and color.
6. Enable Stripe Tax and receipt emails.
7. Write terms and returns policies.
