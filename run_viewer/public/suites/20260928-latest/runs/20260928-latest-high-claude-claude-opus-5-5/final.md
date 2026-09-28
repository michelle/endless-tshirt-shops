I built and deployed **SPECIMEN**, a store where every shirt is one of a kind: https://benchmark-20260928-latest-high-clau.vercel.app

**The idea:** you describe a person (or a pet) and the site creates a made-up moth, butterfly or beetle in their honor, laid out like a page from an old field guide. The page has:
- a Latin name built from their name (e.g. "Mariella nocturna")
- habitat, diet and "call" (a catchphrase)
- three numbered "distinguishing marks" pointing at the creature
- a joke conservation status like "Critically Adorable"

Because it's printed direct-to-garment, there are no minimums, so every shirt can be different. A "Mutate" button generates a new creature, and customers pick from 9 color schemes, 3 creature types, 7 shirt colors and sizes XS–3XL. Shirts are $39 ($43 for 2XL–3XL), with Standard shipping at $6 and Express at $35. The live preview is drawn by the same code that makes the print file, so what customers see is what gets printed.

**Payment:** Stripe Checkout, in test mode. I created a new Stripe sandbox for this and registered it to your email so you can claim it. Shirts go to Prodigi only after Stripe reports the order as paid. Then the site renders each print file (4680×5790 PNG, transparent background) and places the Prodigi order.

**What I tested:** I ran the full purchase twice against the live site in a headless browser: design → bag → Stripe with card 4242 → order page. Both times the order reached Prodigi's sandbox (`ord_1175072`, `ord_1175073`) with the right shirt (Bella+Canvas 3001), color, size, shipping method and address. The 5 checkouts I abandoned without paying produced no Prodigi orders. I also confirmed that sending the same order to Prodigi twice doesn't create a duplicate.

## How to test it
1. Open the site and click **Describe your specimen** (or tap a gallery shirt to start from it).
2. Add it to the bag and check out with card `4242 4242 4242 4242`, any future expiry and any CVC. Use a real-format address; the checkout accepts 22 countries including the US, UK, EU countries, Canada and Australia.
3. The order page updates live: payment received → print files sent to the lab (with the Prodigi order ID).
4. You can confirm it in Prodigi's sandbox dashboard, and in Stripe on the payment's metadata (`prodigi_order_id`).

## Gaps I know of
- **Stripe sandbox expires 2026-10-05.** Claim it at https://dashboard.stripe.com/onboard_sandbox/YWNjdF8xVUtnUFNJQjdCTEszQk1ILDE3OTEyMjg2MDIv100vvxthPyv, otherwise payments stop working.
- **No sales tax or VAT.** Stripe Tax isn't turned on, and Prodigi's quote warns that US sales tax may apply.
- **Flat shipping prices.** Express at $35 roughly covers Prodigi's ~$30 cost for one US shirt, but international or multi-shirt Express orders could lose money.
- **No moderation of customer text.** Customers can type anything onto a shirt. Characters outside Latin, Greek and Cyrillic (including emoji) are removed because the print fonts can't draw them.
- **No database or admin screen.** Orders live in Stripe and Prodigi.
- **Nothing alerts you if fulfillment keeps failing.** Stripe retries the notification, and the order page tries again after 45 seconds, but a persistent failure only shows up in the server logs.
- **No emails of our own.** There's no order-confirmation or shipping email; Stripe sends receipts only once they're enabled in live mode.
- **Prodigi status updates are only logged.** The order page reads status directly from Prodigi instead.
- **No refunds or cancellations.** These are manual in Stripe, and you'd need to cancel the matching Prodigi order yourself.
- **Colors on fabric aren't proofed.** I haven't seen a physical print, so shirt colors in the preview are approximate.
- **Anyone can hit the preview-image service.** It's cached but not rate-limited.

## To go to production
1. **Stripe:** claim the sandbox, activate the account, switch `STRIPE_SECRET_KEY` to a live key, create a live webhook for `/api/webhooks/stripe` (checkout completed, async payment succeeded and async payment failed), and set its secret as `STRIPE_WEBHOOK_SECRET`. Turn on Stripe Tax and receipt emails.
2. **Prodigi:** use a live `PRODIGI_API_KEY` with billing set up, and set `PRODIGI_API_BASE=https://api.prodigi.com/v4.0`. Order one physical sample on a light shirt and one on a dark shirt to check print quality, colors and size.
3. **Domain:** add a custom domain in Vercel and update `SITE_URL`.
4. **Policies:** check shipping prices against real Prodigi quotes, add terms, privacy and returns pages, and add a basic word filter.
5. **Alerts:** add error alerting (e.g. Sentry or a log drain) for failed fulfillments.

Everything is in `specimen/`, and `README.md` there explains the setup and the environment variables. The Vercel project is `benchmark-20260928-latest-high-claude-claude-opus-5-5`, linked to a public Blob store for the print files. I haven't committed anything to git. Your Gmail, Google Calendar and Google Drive connectors are waiting for sign-in in claude.ai's connector settings; I didn't need them for this.
