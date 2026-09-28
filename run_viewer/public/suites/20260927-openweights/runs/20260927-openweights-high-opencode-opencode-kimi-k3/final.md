**Done. The store is live: https://benchmark-20260927-openweights-high-topaz.vercel.app**

## What I built — **Sidereal**: "Wear the sky of your moment"

Personalized star-map t-shirts: the customer picks a date, time, and place, and we chart the **real night sky** for that exact minute — 2,887 stars (≤ mag 5.5 from the Yale Bright Star Catalog), 150 constellation line segments (d3-celestial), graticule, horizon ring — computed with real positional astronomy (GMST → alt/az → stereographic projection) and printed DTG via Prodigi. A custom title/subtitle (e.g. "The Night We Met") and coordinates complete the print. That's a design that is only possible *because* DTG makes every print unique.

**Flow:** `/design` (live SVG preview on a shirt mockup, 6 garment colors × ink pairings, sizes XS–2XL, qty) → `/checkout` (address) → Stripe Checkout (hosted payment) → **webhook `checkout.session.completed` → Prodigi order** → `/order/[id]` status page.

Key architecture: the print file is a **deterministic stateless URL** (`/api/design.png?d=…&ink=…`) — SVG built by shared client/server code, rasterized by sharp at 4680×5790 (Prodigi's required resolution), with all text converted to vector paths via opentype.js + an embedded Marcellus TTF, so server rendering needs no system fonts. No database: order payloads ride in Stripe session metadata; idempotency = Stripe metadata flag + Prodigi `idempotencyKey` = session id.

## Verified (all real API calls, sandbox)

- ✅ Stripe checkout session creation via `/api/checkout`; webhook signature verification (bad sig → 400)
- ✅ Paid session → production webhook → **Prodigi order created** (`ord_1174810`); second delivery → same order (idempotent)
- ✅ **Prodigi downloaded my production PNG asset** — status `Complete`, item `Ok` (proves the print file is publicly fetchable and valid)
- ✅ Prodigi payload accepted (`Created`) and cancellable; order page shows paid/fulfilled/awaiting-payment/not-found states correctly
- ✅ Landing page renders three real star charts (Apollo 11, Y2K Sydney, Santorini wedding) from the same print pipeline

## How to test it

1. Open the URL → **Create yours** → tweak title/date/place/colors (preview updates live) → **Continue to shipping** → fill any address → **Pay with Stripe**
2. Use Stripe test card `4242 4242 4242 4242`, any future expiry, any CVC/ZIP
3. You'll land on `/order/{sessionId}` showing your shirt preview + Prodigi order ID + live print status
4. Inspect orders: `curl -H "X-API-Key: $PRODIGI_API_KEY" https://api.sandbox.prodigi.com/v4.0/orders`

## Known gaps

- **No card-form click-through test** — this session has no browser attached, so the Stripe-hosted page itself was verified by HTTP + API-level payment only (Stripe CLI fixtures created genuinely *paid* sessions to drive the real webhook→Prodigi chain). Do one manual 4242 purchase to confirm the redirect UX.
- **Shared sandbox account noise**: other benchmark runs' stores receive the same account's webhook events. My handler ignores foreign sessions (`not_ours` → 200); twice, a sibling run's store fulfilled my test session first and Prodigi deduped correctly. A single-tenant account won't see this.
- USD-only, flat $38 with free standard shipping; no tax collection; city list covers ≥250k population + capitals (custom coordinates/lat-lon + timezone picker covers the rest).
- No order emails (Stripe sends its own receipt); no cart (single line item, qty ≤ 5); star catalog is J2000 without precession (fine for print aesthetics).

## To production

1. Claim the Stripe sandbox (its `sandbox_claim_url` in the CLI profile) or use a real account: swap `STRIPE_SECRET_KEY` to live, recreate the webhook endpoint (`checkout.session.completed` → `/api/stripe/webhook`), update `STRIPE_WEBHOOK_SECRET`
2. Swap `PRODIGI_API_KEY`/`PRODIGI_BASE_URL` to live (`https://api.prodigi.com/v4.0`)
3. Enable Stripe Tax + address collection, add a custom domain, and add a privacy/returns page before taking real money

Source + README live in `runs/20260927-openweights-high-opencode-opencode-kimi-k3/workspace/`.
