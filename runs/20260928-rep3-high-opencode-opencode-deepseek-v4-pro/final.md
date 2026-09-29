The build is complete and deployed. Here's my completion report.

---

## What I built

**Stellara** — a custom star-map t-shirt store. The concept leans into DTG's one-off nature: every shirt is printed with the *exact night sky* from a moment the customer chooses (a first date, a birth, a goodbye). No two shirts are ever the same.

- **Theme:** "Wear the night that mattered." Customers pick a date + place, a title, and an optional subtitle, then choose shirt colour/size.
- **Real astronomy:** the design computes actual star positions (sidereal time → altitude/azimuth → stereographic projection) from an embedded bright-star catalogue, with real constellation lines (Orion, Ursa Major, Cassiopeia, Cygnus, etc.) plus a seeded field of fainter stars. The same date+place always produces the same sky.
- **Stack:** Next.js 14 (App Router) on Vercel · Stripe Checkout for payments · Prodigi Print API (sandbox) for DTG fulfilment · `sharp` to rasterise the SVG into a print-ready PNG.

## Deployed

**https://benchmark-20260928-rep3-high-openco-six.vercel.app**

## How to test it

1. **Browse** the landing page and click **"Design your shirt"** (or go to `/design`).
2. **Customise** — change the date, place, title, colour, size. The preview updates live.
3. **Checkout** — click "Checkout". You'll be redirected to Stripe Checkout, which also collects the shipping address.
4. **Pay with a test card:** `4242 4242 4242 4242`, any future expiry, any CVC, any ZIP.
5. After payment you land on `/success`. The webhook fires on `checkout.session.completed` (only when `payment_status === "paid"`), and a Prodigi order is created — I verified this end-to-end (orders `ord_1175138`/`ord_1175139` in the Prodigi sandbox, with the correct SKU, colour, size, recipient, and a publicly-accessible print image URL).

You can also hit the image generator directly: `/api/star-map?date=2019-06-14&lat=48.8566&lng=2.3522&loc=Paris&title=The%20Night%20We%20Met` (SVG) and add `&format=png` for the print asset.

## Gaps I know of

- **Faint stars are stylised, not real.** The ~90 bright stars and constellation lines are astronomically accurate; the ~420 faint background stars are procedurally generated for texture. A production version would use a full star catalogue (e.g. HYG).
- **Flat pricing.** `$34 + $6` shipping is hardcoded. Prodigi's quote endpoint should drive real per-destination pricing.
- **No geocoding.** Customers enter lat/lng manually (or use browser geolocation). A geocoding API (Mapbox/Google) would make "type a city" work.
- **Timezone simplification.** Local time → UTC is approximated via longitude/15, ignoring DST and timezone boundaries.
- **No order persistence.** Order state lives in Stripe session metadata + Prodigi; there's no database for order history, accounts, or admin.
- **No email confirmations** beyond the success page (Prodigi's branded-email feature isn't wired up).
- **Next.js 14.2.35** has published security advisories (mostly self-hosted/edge cases that don't apply here — no image optimizer, middleware, or server actions). Upgrade to Next 15/16 for production.

## To bring it to production

1. **Swap keys:** replace the Prodigi *sandbox* key and `api.sandbox.prodigi.com` with a live key and `api.prodigi.com`; replace the Stripe *claimable sandbox* key with a real restricted key scoped to Checkout + webhooks.
2. **Real pricing** via Prodigi's quote endpoint, and real shipping methods.
3. **Add a database** (e.g. Postgres/Vercel KV) for orders, and a geocoding provider.
4. **Upgrade Next.js** to a patched major, and add a custom domain + TLS (already HTTPS on Vercel).
5. **Configure Prodigi branding/emails** and a proper order-pause window so you can review before fulfilment.

The app is fully functional in test mode: browse → customise → pay → auto-fulfil to Prodigi, with fulfilment gated on successful payment.
