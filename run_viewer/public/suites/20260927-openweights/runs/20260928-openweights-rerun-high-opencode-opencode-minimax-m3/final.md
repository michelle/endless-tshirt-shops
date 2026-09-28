The build is complete. Here's the wrap-up:

---

**Built and deployed: StarMap Tee** — a one-of-one DTG t-shirt store at **https://benchmark-20260928-openweights-reru-nu.vercel.app**

**What it does**
- Customer picks a date + lat/lon + place + title → live SVG star map with real moon phase (Conway's algorithm) and a seeded star field renders in their browser
- Same scene ships to Prodigi as a 3500×4424 PNG tied to the public URL `/api/asset?…`
- Stripe Checkout (hosted) collects payment + shipping; webhook reads the design out of metadata, posts to Prodigi (`POST /v4.0/orders`); Prodigi fetches the asset from Vercel and prints
- All state lives in the URL + Stripe session metadata + a JSON-file order record — no database

**Stack**
Next.js 14 (App Router) + TypeScript + Stripe SDK + Prodigi REST + `sharp` + `opentype.js`. Single SKU: `GLOBAL-TEE-BC-3001` (Bella+Canvas 3001, ships worldwide).

**Verified end-to-end on the live URL**
- `GET /` 200; `GET /api/preview-svg` 200 (214kb SVG); `GET /api/asset` 200 (843kb PNG, the URL Prodigi fetches)
- `POST /api/checkout` returns a real `cs_test_…` session with a `checkout.stripe.com/c/pay/…` URL
- `POST /api/stripe-webhook` rejects unsigned requests (400) and accepts signed ones (200)
- The full webhook → Prodigi path produced `ord_1175046` in Prodigi, and Prodigi sandbox confirmed `asset.status: Complete` (the lab fetched my Vercel-hosted PNG)

**How to test it**
1. Open https://benchmark-20260928-openweights-reru-nu.vercel.app
2. Pick a date, lat/lon (try NYC 40.71 / -74.01), place name, title
3. Click *See your sky →*, then *Buy for $34.99 USD →*
4. On Stripe's hosted page, use card `4242 4242 4242 4242`, any future expiry, any CVC
5. After paying you'll land on `/success?session_id=cs_test_…` and see the Prodigi order id + status

Direct PNG URL probes (for the printer asset):
- `https://benchmark-20260928-openweights-reru-nu.vercel.app/api/asset?date=2018-09-04&lat=40.7128&lon=-74.0060&title=The+night+we+met&place=New+York,+NY`

**Gaps / things to know before going live**
1. **Sandbox keys everywhere.** The `STRIPE_SECRET_KEY` is a sandbox restricted key (`rkcs_test_…`), `STRIPE_WEBHOOK_SECRET` is whatever `stripe listen` printed on the operator machine, and `PRODIGI_API_KEY` is the benchmark sandbox key — none move real money or print a real shirt today.
2. **`STRIPE_WEBHOOK_SECRET` for production:** configure the production webhook in the Stripe dashboard pointing at `…/api/stripe-webhook` and copy its signing secret over the env var, then redeploy.
3. **Order records are JSON files** in `data/<id>.json` — ephemeral on Vercel's serverless filesystem. Swap `lib/store.ts` for Vercel KV / Blob / Postgres / Turso so polling survives across deploys (≈30 lines).
4. **No transactional email yet.** Wire Resend or Postmark into the Prodigi status callback for "shipped" notifications.
5. **Moon-phase math is Conway's approximation**, accurate to within a day — a date USNO calls "full" might render as waxing gibbous. Use Suntimes for ±-day accuracy if you care.
6. **No geocoding.** The customer types lat/lon; a Nominatim/Mapbox autocomplete on the place field would be nicer UX (one fetch in `DesignForm.tsx`).
7. **Stripe Tax is off.** Toggle a single flag in `app/api/checkout/route.ts` to enable.

**Operator commands you might want**
```sh
# Live webhook forwarding (dev)
stripe listen --forward-to https://benchmark-20260928-openweights-reru-nu.vercel.app/api/stripe-webhook

# Re-run the end-to-end against any URL
WEBHOOK_TARGET=https://benchmark-20260928-openweights-reru-nu.vercel.app/api/stripe-webhook \
STRIPE_WEBHOOK_SECRET=$WEBHOOK_SECRET \
  npx tsx scripts/test-webhook.ts

# Redeploy
vercel deploy --prod --yes
```

`final.md` is at `$BENCHMARK_FINAL_OUTPUT` with the same content, plus a longer checklist.
