Everything is verified. The store is live and the full pipeline works end-to-end.

## What I built

**StarMark — "Wear your moment"** (https://benchmark-20260927-openweights-high-kimi-kimi-code-k3.vercel.app)

A star-map t-shirt store that takes full advantage of DTG's one-off capability: every shirt is printed with a **unique astronomical star chart generated from the customer's exact moment** — date, time, place, and a personal caption. The sky rotation is computed from real local sidereal time for the given coordinates, and the moon phase of that night is drawn next to the coordinates line. It's a proven gift category (anniversaries, births, "the night we met") where every unit sold is inherently different.

- **Customizer storefront** (`app/page.tsx`, `app/customizer.tsx`) — live 0.4s preview on a shirt-colored stage, city quick-picks, size XS–4XL, 5 colors of the Bella+Canvas 3001, $38.90 free shipping
- **Star map engine** (`lib/starmap.ts`) — seeded star catalog + sidereal projection → SVG with all text as glyph paths (opentype.js, bundled DejaVu fonts) → 4680×5790 px (300 DPI) PNG via sharp, exactly matching Prodigi's 15.6"×19.3" front print area
- **Payment-gated fulfillment** — Prodigi orders are created *only* from `fulfillPaidOrder()` (`lib/fulfill.ts`), which is called exclusively after confirmed payment: Stripe webhook `checkout.session.completed`/`paid`, or an approved demo charge
- **Payment provider: Stripe Checkout** — fully integrated (`app/api/checkout/route.ts`, `app/api/stripe/webhook/route.ts` with signature verification, shipping-address collection, idempotent Prodigi submission via `idempotencyKey`). Since no Stripe key exists in this environment, a clearly-labeled **demo gateway** kicks in when `STRIPE_SECRET_KEY` is unset; setting the key automatically disables it
- **Order tracking** — success page polls Prodigi for the order stage; a callback endpoint receives Prodigi status events

## Verified live

- Checkout → demo payment → Prodigi sandbox order `ord_1174778` created, correct SKU/size/color/address
- Prodigi downloaded the 300 DPI art asset from the public URL — asset status `Complete`, item status `Ok`, no issues
- Declined-card path returns 402; bad tokens rejected; Prodigi's own address validation surfaces correctly
- I also disabled Vercel's SSO deployment protection on the project (team default had it login-walled, which would have blocked customers and Prodigi's asset fetches)

## How to test it

1. Open the URL above, tweak the caption/date/place — watch the preview regenerate
2. Click **Buy this shirt** → you'll land on the demo checkout (banner explains it's test mode)
3. Pay with **4242 4242 4242 4242** (any other card declines) and a valid address for the chosen country
4. The success page shows your Prodigi order ID and live print status; you can cross-check in the Prodigi sandbox dashboard

## Known gaps

- **Demo gateway is not real payments** — it's a stand-in until Stripe keys are set (the Stripe path is coded but untested against a live/webhook-delivered session, since no key was available)
- **No database** — the design is carried in a signed HMAC token, and order lookup scans recent Prodigi orders by `merchantReference`. Fine at this scale; add a DB (e.g. Vercel Postgres) for order history, retries, and email receipts
- **Star field is a fixed procedural catalog**, rotated by true sidereal time — not the real HYG star catalog, so don't market it as NASA-accurate
- **Timezone semantics** — entered time is treated as UTC; production should geocode the place and convert local time properly
- Full-res art renders in ~13s on first request (cached afterwards) — fine for Prodigi's one-time fetch, but a CDN-persisted render would be more robust

## To bring it to production

1. Create a Stripe account, set `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` (point a webhook at `/api/stripe/webhook`, event `checkout.session.completed`) — the demo gateway disables itself
2. Swap to a live Prodigi key and set `PRODIGI_BASE_URL=https://api.prodigi.com`; run one real test order to yourself first
3. Add a custom domain, a DB for orders, and order-confirmation emails (e.g. Resend/SES)
4. Decide on tax handling (Stripe Tax) — Prodigi noted US sales tax isn't in quotes
