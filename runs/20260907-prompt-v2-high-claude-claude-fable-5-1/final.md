The store is built, deployed, and verified end to end against the Prodigi sandbox.

**Live site:** https://benchmark-20260907-prompt-v2-high-c-nine.vercel.app

**The theme: The Obsolete Guild.** Union-badge tees for professions that no longer exist. Ten designs, each an original vector badge with a founding year from real history, a "Local" number, a motto, and a short obituary for the trade on the product page: Lamplighters, Knocker-Uppers, Ice Harvesters, Human Computers, Switchboard Operators, Pinsetters, Rat Catchers, Town Criers, Telegraphists, and Cigar Factory Lectors. Each badge is generated in two inks (cream for dark shirts, charcoal for light ones), rendered to 4500×5400 transparent PNGs at 300 dpi. Eight shirt colours, sizes XS to 4XL, on Bella + Canvas 3001 at $34.

**How to test it**
1. Open the site, pick a shirt, choose a colour and size, add to cart.
2. Go to Checkout. Enter any address in a supported country. Shipping is quoted live from Prodigi for that country and shown before you submit.
3. Click "Place test order". The page states clearly that no payment is taken. The order is created in the Prodigi sandbox and you land on a confirmation page with an `ord_…` number.
4. Paste that number into "Track order" in the header to see status straight from Prodigi.
5. Or run the automated browser flow from the `shop` directory:

```bash
node scripts/e2e-flow.mjs https://benchmark-20260907-prompt-v2-high-c-nine.vercel.app
```

I placed three sandbox orders this way. Prodigi downloaded the print files from the Vercel host and marked both items in the production-placed order as Ok, so the artwork pipeline is valid.

**Known gaps**
- **No real payments.** The Stripe config file provided to me was empty, so there are no Stripe keys. The Stripe Checkout path is written and gated on `STRIPE_SECRET_KEY`, with a webhook plus an idempotent fallback on the success page, but it is untested. Until keys exist, checkout runs a clearly labelled no-charge test mode.
- **No order emails.** Confirmation is on-page only. Prodigi sends its own shipping notifications, but there is no store-branded email.
- **Sandbox shipping prices look off** for some destinations (Canada quoted around $26 from a UK lab). Live Prodigi routes to the nearest lab, so expect different numbers.
- **US sales tax is not collected.** Stripe Tax or a similar service is needed if you sell in the US.
- **No admin view.** Orders are looked up by id only. Prodigi's dashboard is the back office.
- **Mockups are schematic.** The shirt preview is an SVG silhouette, not a photo. Order samples before launch.

**To bring it to production**
1. Add `STRIPE_SECRET_KEY`, create a Stripe webhook for `checkout.session.completed` pointing at `/api/stripe/webhook`, and add `STRIPE_WEBHOOK_SECRET`. Then run one real test-card purchase.
2. Swap the Prodigi sandbox key for a live one and set `PRODIGI_API_BASE=https://api.prodigi.com/v4.0`.
3. Set `SITE_URL` to your final domain so print-file URLs are stable, and attach that domain in Vercel.
4. Order one sample of each design to check placement and colour, then adjust `design/generate.mjs` if needed and re-run it.
5. Decide on tax handling and add a transactional email for order confirmation.

The code is in the `shop` folder with a README covering layout, environment variables, and the regeneration script for the artwork.
