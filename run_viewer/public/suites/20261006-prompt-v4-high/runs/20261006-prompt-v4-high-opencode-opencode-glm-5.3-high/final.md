Everything is live, verified, and stable. Here's the complete handover:

---

# ✦ Contours — the store is live

**Live URL: https://pamela-finding-institution-range.trycloudflare.com**

## The concept

**Contours** — *"Wear the shape of a place."* Every shirt is a minimalist topographic contour map of a place the customer chooses, drawn from **real elevation data** (AWS Open Data Terrarium tiles): the summit they climbed, the valley they grew up in, the coastline they got married on. Each design carries a custom title, the place name, exact coordinates, a scale bar, compass, and the marked high point with its elevation. Because DTG prints one-offs at full color, **every shirt is unique** — search any place on Earth (or drop raw coordinates), pick a map window (2.5 / 6 / 15 / 40 km), pick shirt color and size, and the same renderer that draws the on-screen preview produces the print file. Charcoal ink on light shirts, ivory ink on dark shirts.

## What's integrated

| Piece | Details |
|---|---|
| **Product** | Bella + Canvas 3001 unisex crew (`GLOBAL-TEE-BC-3001`) via Prodigi — 9 curated colors, XS–4XL (validated against the real variant catalog) |
| **Price** | $39 (+$4 for 2XL+); shipping priced **live from Prodigi quotes** at checkout (cost × 1.3, rounded up, $5–$29). Unit cost is ~$12 + ~$5 shipping, so margin ≈ 60% |
| **Payments** | **Stripe Checkout** (hosted) — I provisioned a sandbox account headlessly via `stripe sandbox create` (no browser needed). Prints only after Stripe reports `payment_status = paid` |
| **Fulfilment** | Two independent, idempotent triggers: the Stripe **webhook** (signature-verified, timing-safe) and the **success page** — both re-fetch the session from Stripe before doing anything. Prodigi order uses `idempotencyKey = session id`, so retries can never double-print |
| **Print file** | 4680 × 5790 px transparent PNG (the SKU's front print area), artwork nested at a safe ~11.7 × 14.5 in chest size. Design URLs are **self-contained and HMAC-signed** — the design data rides inside the URL, so Prodigi can re-fetch the file even after a server restart or new tunnel URL |
| **Deployment** | Node server (plain `node:http`, no framework) self-hosted behind a **Cloudflare quick tunnel** — public HTTPS, no account needed, auto-restart loops, and it **re-points the Stripe webhook automatically** whenever the tunnel URL changes |

Code is in `…/benchmark-workspace.FICgR3/contours/` (see its `README.md` for architecture). Secrets live in `~/.contour-secrets/` (Stripe keys, webhook secret, print-signing secret).

## How you can test it

1. **Open the store URL** → search a place (try "Matterhorn", "Kyoto", or your hometown) or paste coordinates → watch the live preview and flat print preview update.
2. **Continue to payment** → you're on Stripe's hosted checkout (test mode). Pay with card **4242 4242 4242 4242**, any future expiry, any CVC; fill the shipping form.
3. **Order confirmation page** goes live: it re-verifies with Stripe, then sends the order to Prodigi — you'll see the Prodigi order ID appear, plus its production stage.
4. **`/orders.html`** shows the live order book; **`/api/orders`** is the JSON. Orders also appear in the Prodigi sandbox dashboard and in your Stripe sandbox once claimed.
5. **Automated end-to-end** (what I ran, no browser needed): `npm run smoke https://pamela-finding-institution-range.trycloudflare.com` — it creates a checkout, pays it through the same confirm call the hosted page makes, fulfils, and fetches the print file back.

**Verified end-to-end:** paid session `cs_test_b1kfFK…` → `ord_1178025`; webhook deliveries → 200 (signature-checked); Prodigi **downloaded the 4680 × 5790 print file** (`downloadAssets: Complete`, item `Ok`); duplicate fulfilment calls return the same order (idempotent); forged signatures → 400; unpaid sessions never reach Prodigi.

## Gaps you should know about

- **The deployment is a quick tunnel on this Mac.** Public and working now, but no uptime guarantee; the URL changes if the tunnel restarts (webhook auto-repoints; old print links keep working since they're self-contained) and it's down while the machine sleeps. Current URL is in `contours/.host/url.txt`.
- **The Stripe account is a claimable sandbox and expires 2026-10-13.** Claim it before then: `https://dashboard.stripe.com/onboard_sandbox/YWNjdF8xVU5UcDJEUjNHRXdDS0RVLDE3OTE4ODE0NDQv100lmAjPCOi`. Its key is restricted (`rkcs_…`) — it can run Checkout and webhooks but not read `/v1/account` or `/v1/balance`.
- **No sales tax/VAT** is collected (Prodigi quotes flag US sales tax).
- **`/orders.html` is unauthenticated** (demo order book) and there's no rate limiting on the geocode/contours/tile APIs.
- **Design aesthetics were verified quantitatively** (layout margins, text bands, ink coverage, composition maps) — but no human has eyeballed the artwork yet. Please look at the gallery/preview before ordering stock; tweaks are one-line changes in `public/design.js`.
- USD only, and totally flat/ocean spots gracefully disable purchase (no contour lines to print).

## To bring it to production

1. **Payments:** claim the sandbox or attach your own Stripe account → live keys → register the production webhook → add tax handling.
2. **Fulfilment:** Prodigi live API key + `PRODIGI_ENV=live` (sandbox and live keys differ).
3. **Hosting:** move off the quick tunnel — the handlers are platform-neutral `(req, res)`, so Render/Railway/Fly (Node service) or Vercel/Netlify (functions) work with `PUBLIC_BASE_URL` set; or keep self-hosting behind a *named* Cloudflare tunnel with your own domain.
4. **Keep `PRINT_SIGNING_SECRET` stable** (Prodigi re-fetches assets by URL), swap the JSON order book for a database, add auth + rate limits + webhook-failure monitoring, and implement your refund/cancel policy (Prodigi order actions support it).
