The store is built, deployed, and verified end-to-end. Here's the full picture:

## ✦ Written in the Stars — personalized star-map tees

**Concept:** The customer enters a date, time, and place that means something to them (a birth, a wedding, the night they met), plus names and a dedication line. We compute the *actual night sky* overhead at that moment from a real 2,851-star catalog with all 88 constellation line figures, and render it as an elegant star chart with their typography. Every shirt is astronomically unique — exactly what DTG is for.

**Live store:** https://temporary-brisk-poplar-jvz563n.vercel.app

## How it works

- **Frontend** (`index.html` + `assets/`): live SVG preview on a shirt mock that updates as you type; place autocomplete via OpenStreetMap geocoding; 5 shirt colors, sizes S–2XL.
- **Design engine** (`shared/starmap.js`): sidereal-time math + alt-az projection, runs identically in browser (preview) and server (print file). Server-side, text is converted to vector paths with embedded Marcellus/Crimson Text fonts (opentype.js) and rasterized by sharp to a **4500×5400 px transparent PNG**.
- **Payments**: Stripe Checkout (test-mode sandbox). Shirts are $34.99; Stripe collects the shipping address.
- **Payment-gated fulfillment**: only after `checkout.session.completed` with `payment_status=paid` does the webhook submit the order to Prodigi (Gildan 5000, `fitPrintArea`, front print). A fallback in `/api/status` fulfills on the success page if the webhook is delayed, and idempotency is enforced via a `prodigi_order_id` marker written back to the Stripe session metadata.
- **Art delivery to Prodigi**: stateless signed URLs (`/api/art?d=…&sig=…`, HMAC-SHA256) regenerate the identical print file on demand — no database needed, and Prodigi can fetch it any time.

## Verified

- Live checkout session creation, geocoding, signed art endpoint (bad signatures rejected with 403)
- Simulated paid webhook → Prodigi sandbox order **`ord_1178016`** created with the public art URL (visible in your Prodigi sandbox dashboard, stage `InProgress`)
- Stripe webhook endpoint registered and receiving at the live URL; metadata write-back confirmed working
- Unpaid sessions correctly do **not** fulfill

## How to test it

1. Open the store URL, fill in names/date/time/place (pick a suggestion from the place dropdown), choose color/size.
2. Click **Buy this shirt** → Stripe Checkout. Use test card `4242 4242 4242 4242`, any future expiry, any CVC/ZIP, and fill in a shipping address.
3. You'll land on the success page, which polls and shows the Prodigi order ID and stage once fulfillment fires (a few seconds).

## Important: claim the deployment

The URL is an **anonymous Vercel deployment that expires 60 minutes after each deploy**. I set up a keep-alive loop that redeploys every 40 minutes while this session is running, but to keep it permanently, claim it into a (free) Vercel account now:

**https://vercel.com/claim-deployment?code=139def5e-58dd-4706-81e0-ecee22158c4a**

## Known gaps

- **Timezone approximation**: entered times are interpreted as local *solar* time at the chosen longitude (±~30 min off civil time in some regions). Production should use a real tz database (e.g. `tz-lookup`).
- **No database**: order state lives in Stripe session metadata only. Fine at demo scale; production needs real order storage.
- **Browser preview font** is Google Fonts CSS while print uses embedded fonts — visually matched but not pixel-identical.
- Single print provider/SKU (Gildan 5000, Budget shipping); no shipping-cost calculation at checkout.
- Idempotency depends on the Stripe metadata write; a failed write plus a webhook retry could double-submit to Prodigi (rare; a lookup-by-reference guard would close it).

## To go to production

1. **Claim the Vercel deployment** (link above), or redeploy under your account; attach a custom domain.
2. Swap Stripe test keys for live keys, re-register the webhook for your domain, update `STRIPE_WEBHOOK_SECRET`.
3. Switch `PRODIGI_API_KEY` to a production key (code already targets `PRODIGI_BASE_URL`, currently the sandbox) and order a physical sample to check print quality.
4. Move secrets to Vercel project env vars; rotate the sandbox keys.
5. Add a tz database, real order storage, order-confirmation email, and shipping/tax calculation (Stripe supports automatic tax + shipping rates).
