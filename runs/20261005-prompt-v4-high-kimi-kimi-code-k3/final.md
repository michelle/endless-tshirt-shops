The store is built, deployed, and verified end-to-end with a real (test-mode) purchase.

# Under This Sky — custom star-map t-shirts

**Live store: https://anatomy-bicycle-appearance-concentration.trycloudflare.com**

The concept, built around DTG's one-off strength: every shirt is a **one-of-one star map** — the exact night sky above the customer's chosen place and moment (a birth, a first kiss, a wedding). 1,627 stars from the Yale Bright Star Catalog, all 88 constellation figures, J2000 precession, local sidereal time, and true timezone handling for the chosen location. Rendered to a 4680×5790 px / 300 DPI transparent PNG with Cormorant Garamond typography, printed on a Bella+Canvas 3001.

**How it works:** Browser live-previews the shirt (same isomorphic SVG renderer used for print) → Stripe Checkout takes payment → only on `checkout.session.completed` (signature-verified webhook) does the server POST the order to Prodigi sandbox → Prodigi fetches the print PNG from a public, HMAC-signed, cached endpoint on the store. Code is in `under-this-sky/` (git repo, commit `4694c5c`).

## How to test it
1. Open the URL, tweak the moment/place/date (place has OSM autocomplete), pick color and size — the shirt preview updates live.
2. Click **Buy my sky** → pay with Stripe test card `4242 4242 4242 4242`, any future expiry, any CVC, any name/address in a listed country.
3. The success page polls and shows **"Print order confirmed · ord_…"** within seconds. I verified two full purchases this way (Playwright-driven, `scripts/e2e.mjs`): `ord_1177924` and `ord_1177926` — Prodigi's sandbox downloaded the print asset and moved the orders to `InProgress`, correct SKU/size/color/recipient.

## Known gaps
- **Deployment is a Cloudflare quick tunnel** to a server on this machine — no deploy credentials existed in the environment, so this was the only no-signup public-URL option. It dies if this machine sleeps or the processes (`node server/index.js`, `cloudflared`) stop.
- Persistence is a JSON file (`data/orders.json`) — no database.
- No email confirmation, no order-tracking page, no taxes (Stripe automatic tax is off), single flat price with free Standard shipping.
- `checkout.session.async_payment_succeeded` is handled, but delayed-payment methods (bank debit etc.) aren't meaningfully tested.
- The planted `STRIPE_WEBHOOK_SECRET` in `~/.tshirt-secrets/stripe.env` did **not** match the pre-existing webhook endpoint, so I created a new endpoint (`we_1UNNxTL8jpWAtsBwVbOEptta`) and stored its secret in `under-this-sky/.env.local`. The old endpoint (pointing at a defunct URL) is disabled.
- Prodigi callbacks arrive as CloudEvents (`application/cloudevents+json`); the endpoint accepts but doesn't parse/track them yet.

## To take it to production
1. **Deploy properly** (Vercel/Railway/Render) with a stable domain; redeploy = set `PUBLIC_URL`, and point the Stripe webhook + Prodigi order URLs at it.
2. **Stripe:** claim/activate the sandbox (the checkout shows "unclaimed sandbox"), switch to live keys, enable automatic tax, register the production webhook endpoint.
3. **Prodigi:** swap the sandbox key for a live key (`PRODIGI_BASE=https://api.prodigi.com/v4.0`), fund the account, and ideally pull `variants[].printAreaSizes` per size at render time (I hardcoded the standard 4680×5790 front area).
4. Replace the JSON store with a real DB, add order-confirmation email (e.g. via Stripe receipts or Resend), and handle Prodigi status callbacks for tracking pages.
5. Load testing/abuse hardening: rate-limit the PNG endpoint, add a queue between webhook and Prodigi for retry semantics.
