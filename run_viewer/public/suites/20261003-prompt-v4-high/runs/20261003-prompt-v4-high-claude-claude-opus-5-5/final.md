I've built and deployed **Lifeline Transit Co.**, which sells custom t-shirts that map a customer's life as a subway line. It has passed a full live test: design, Stripe payment, Prodigi order, Prodigi downloading the print file. The catch is that the live URL expires about an hour after deploy (around 00:46 your time) unless you claim it.

**Live store:** https://temporary-fast-canyon-36yufg9.vercel.app
**Claim it to keep it:** https://vercel.com/claim-deployment?code=72b2a9fe-f6cd-418c-af50-5b57e14dab6f

## The concept
Customers name every stop on their line: hometowns, first flat, the bar where they met. The page draws a transit map live as they type. There are two layouts:
- **One line:** life stories, graduations, pub crawls.
- **Two lines that merge:** couples. Each person's line runs separately, then joins at the stop where they met.

There are four starting templates, 11 line colors, 6 shirt colors, and mixed sizes for group orders (up to 20). The product is a Bella+Canvas 3001 at $38. Shipping is $5.95 standard or $24.95 express, against a Prodigi sandbox cost of about $16–45 per shirt.

## Print quality
- **Same file as the preview:** the code that draws the browser preview also produces the file sent to Prodigi, at full print resolution (4680×5880 px, 300 dpi).
- **Chest-print size:** the artwork is at most 12" wide, with no semi-transparent ink.
- **Dark vs light shirts:** station centers are left unprinted on light shirts and printed solid white on dark ones.
- **Warnings and limits:** the site warns when a line color won't stand out on the chosen shirt. I checked worst cases (most stops, longest names), and they shrink to fit inside the print area.

## Payments and fulfillment
- **Provider:** Stripe Checkout. Cards, Apple Pay, Klarna and similar methods all work.
- **Paid-only:** before anything goes to Prodigi, the server asks Stripe directly and requires the order to be marked paid.
- **Three triggers:** Stripe's webhook, the customer's order page, and a background sweep that runs whenever a new checkout starts.
- **No duplicates:** Prodigi refuses a second order with the same Stripe session ID, so overlapping triggers are safe.

What I tested on the live site:
- Two full purchases with a test card produced Prodigi orders `ord_1176887` and `ord_1176901`. Prodigi downloaded the print file both times, with the correct sizes, color and address.
- A buyer who paid and closed the tab was picked up by the next customer's checkout (`ord_1176900`).
- Unpaid sessions were never sent, and webhooks with bad signatures were rejected.

## How to test
1. Open the store, pick a template or edit the stops, choose a color and sizes, and click Checkout.
2. Pay with card `4242 4242 4242 4242`, any future expiry, any CVC, and a US, UK, EU, Canadian or Australian address.
3. You'll land on an order page showing the Prodigi order ID. The order also appears in your Prodigi sandbox dashboard.

## Gaps
- **Stripe sandbox isn't claimed yet.** While unclaimed, Stripe never delivered webhooks (I confirmed this). Orders still go through via the other two triggers. Claim it before Oct 11 at https://dashboard.stripe.com/onboard_sandbox/YWNjdF8xVU1XVG5CQnduaHdHWTVELDE3OTE2OTkyOTQv100KFe4heNx
- **Test key appeared in my log.** The sandbox's test-mode key was printed once. Roll it after claiming.
- **No daily backup sweep yet.** Anonymous Vercel deployments can't run scheduled jobs; the README has the one-line config to add after claiming.
- **No tax collection.** No sales tax or VAT is charged, and prices are USD only.
- **No emails or alerts.** The store sends no emails of its own (receipt emails depend on your Stripe settings), and nothing alerts you if a Prodigi order fails. Failures are only logged and retried.
- **Later order stages untested.** The Prodigi sandbox never moves orders past the first stage, so the "printing" and "shipped/tracking" steps on the order page haven't been seen working.
- **No legal pages or support address.** There are no terms, privacy or refund pages. The FAQ promises free reprints for misprints; check that you're happy with that.
- **Refunds don't cancel print orders.** A refund in Stripe leaves the Prodigi order in place.
- **Test orders left in Prodigi.** Three sandbox orders remain, plus one cancelled probe order.

## To go to production
1. **Hosting:** claim the Vercel deployment (or `vercel login`, then `scripts/deploy.sh --linked`), add your domain, and add the daily sweep from the README.
2. **Stripe:** claim and activate the account, switch to live keys, and create a live webhook to `https://<domain>/api/webhook` with its signing secret. Turn on receipt emails, and ideally Stripe Tax.
3. **Prodigi:** switch to a live API key with `PRODIGI_API_BASE=https://api.prodigi.com/v4.0`, and add billing.
4. **Physical samples:** order a few shirts first, especially a dark one and a yellow line on a light one, to check placement and color.
5. **Store pages:** add legal pages and a support contact.

The code is in a local git repo in the working directory. The README covers the architecture and settings; the test scripts and deploy script are in `scripts/`. Secrets are in `.env.local`, which is excluded from git.
