Everything is verified working. The store is complete. Here's my final report:

---

# CELESTEE ✦ — custom star-map tees, live and fully functional

**Store:** https://benchmark-20260928-rep3-high-openco-michelles-projects-bbac2d93.vercel.app
(Vercel project `benchmark-20260928-rep3-high-opencode-opencode-kimi-k3`, latest deployment promoted to production)

## The concept

**"Wear the sky from your moment."** Customers pick a date, time, and place — a first kiss, a birth, the night everything changed — and we chart the **astronomically real** night sky overhead: ~1,289 stars from the Yale Bright Star Catalogue, all 88 IAU constellation figures, and the moon's true phase, rendered as an original print artwork with their dedication. Every shirt is computed, not templated — a perfect fit for DTG's one-off economics. Bella + Canvas 3001, 6 colors, XS–4XL, $34 + flat shipping.

## How it works (all verified end-to-end on the live deployment)

1. **Design** (`/create`): dedication text, 10k-city gazetteer with timezone-aware search (or browser geolocation), date/time, color/size — with a live canvas preview composited on a tee mockup. The same renderer produces the web preview and the 300 DPI print file.
2. **Pay**: our checkout form → Stripe Checkout Session (line item shows the actual artwork thumbnail) → hosted Stripe payment page.
3. **Fulfil only after payment**: two independent, idempotent paths — a signature-verified Stripe **webhook** (`checkout.session.completed`) and the **success-redirect** (`/order` polls `/api/order/status`, which re-fetches the session from Stripe and requires `payment_status === 'paid'`). Prodigi dedupes on `idempotencyKey = <stripe session id>`.
4. **Print**: Prodigi fetches the print file from `/api/artwork?…` — a deterministic, immutable-cached PNG endpoint, so no storage layer is needed.

## Test evidence (run just now against production)

- Paid a real Stripe sandbox checkout with `4242 4242 4242 4242` → redirected to `/order` → page shows **"Sent to the print lab — order ord_1175188"** ($38.90 charged).
- **Webhook-only proof**: queried Prodigi *before* opening the success page — order already `InProgress`, created purely server-to-server.
- **Idempotency proof**: repeat fulfil calls return `AlreadyExists`, no duplicate orders.
- **Asset proof**: Prodigi reports `downloadAssets: Complete`, item status `Ok` — it successfully pulled the print PNG from the Vercel URL.
- Negative paths: unpaid session → no fulfilment; invalid session/artwork params → clean 400/502.

## How to test it yourself

1. Open the URL → **Create yours** → type a dedication, pick a city, set date/time, choose color/size.
2. Continue → fill any address → **Pay** → on Stripe's page select **Card** and use `4242 4242 4242 4242`, any future expiry, any CVC/ZIP.
3. You'll land on the order page showing your Prodigi order id. (Everything is sandbox: no real charges, no physical shirt.)

## Known gaps

- **No database** (deliberate): order state lives in Stripe metadata + Prodigi; the order status page works only via the session link. Fine at this scale; a real store wants orders in a DB + customer emails.
- **No transactional email** (Stripe sends its own receipt).
- **Star catalog limited to mag ≤ 4.8** (~1,289 stars) — plenty for a shirt, sparser than poster-grade charts. Planets are not plotted.
- Timezone handling uses the browser's IANA database (accurate, incl. DST); historical political timezone edge cases (pre-1970 oddities) may be approximate.
- Mockups are honest flat vector illustrations, not photos.
- Single shirt style/single print area (front); no cart (one shirt per order), no promo codes, no tax calculation.

## To go to production

1. **Stripe**: replace the sandbox keys with live keys (`STRIPE_SECRET_KEY`, and create a live webhook → `STRIPE_WEBHOOK_SECRET`). Note: this deployment currently uses a **claimable-sandbox restricted key** (`rkcs_test_…`) from the environment's `.benchmark-secrets/stripe/` pool — it worked for everything, but production needs a standard live key. Also enable tax collection and review shipping rates.
2. **Prodigi**: swap `PRODIGI_API_KEY` to a live key and set `PRODIGI_API_BASE=https://api.prodigi.com`. Do a paid test order to validate print quality/DPI before launch.
3. **Ops**: add a small DB (Vercel Postgres/KV) for order records, add Prodigi callback handling to drive "shipped" emails, add rate limiting on `/api/artwork`, and a custom domain.
4. **Legal/content**: privacy policy, returns policy (custom goods = no returns except defects), size guide.
