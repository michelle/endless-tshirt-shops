# Starloom — custom star-map t-shirts

**The night sky above your moment, printed on a heavyweight tee.**

Starloom sells one hero product: a Gildan Softstyle 64000 (direct-to-garment) whose
artwork is *computed for each customer*. The buyer picks a **date, a time, and a
place**; the store computes the exact sky that hung above those coordinates at that
minute — every one of ~3,600 catalogue stars in its true altitude/azimuth, plus all
88 constellation lines — renders a 4677×5881 px (300 dpi) print file, and sends it
to the Prodigi print network for printing and worldwide dropshipping **only after
payment succeeds**.

## Architecture

```
browser (public/)                     server (server.js, src/)
┌──────────────────────────┐          ┌────────────────────────────────────┐
│ customizer + live preview│  fetch   │ /api/quote   -> Prodigi quote (USD)│
│ uses THE SAME render.js │ ───────► │ /api/checkout-> order + payment   │
│ that generates the print │          │ /api/pay/:id -> test-gateway charge│
│ file (WYSIWYG, no lie)   │          │        └─► on success:            │
└──────────────────────────┘          │            1. render 300-dpi PNG  │
                                      │            2. host /print-files/ │
                                      │            3. POST /Orders (Prodigi,│
                                      │               md5-checked asset)   │
                                      │ /api/order/:id -> live status     │
                                      └────────────────────────────────────┘
```

* `src/astro.js` — shared astronomy: GMST (Meeus), equatorial→horizontal
  conversion, zenith-centered stereographic projection ("look-up" view: East on
  the left, like a planisphere), IANA wall-time→UTC via `Intl` (DST-safe).
* `src/render.js` — shared renderer; the *same code* draws the browser preview
  and the 300-dpi print file, so previews never lie.
* `src/prodigi.js` — Prodigi Print API v4 client (quotes, orders, status).
* `src/payments.js` — payment drivers (see below).
* `src/fulfillment.js` — post-payment fulfillment pipeline (idempotent).
* `src/orders.js` — JSON-file order store (swap for a real DB in production).
* `src/artwork.js` — print-file generation with `@napi-rs/canvas` + bundled
  Cinzel/Jost (SIL OFL) fonts, deterministic per order snapshot.

Data: stars/constellation lines derived from the Yale Bright Star catalogue
(via d3-celestial data, filtered to mag ≤ 5.7, 3,596 stars) — `data/stars.json`,
`data/lines.json`.

## Payments

Two drivers, selected automatically:

| Driver | When | How it works |
| --- | --- | --- |
| `mock` (default here) | no `STRIPE_SECRET_KEY` set | Hosted sandbox test checkout: Luhn validation, standard test-card outcomes (approve / `card_declined` / `insufficient_funds` / `expired_card`). No real charges — clearly badged in the UI. Fulfillment still triggers **only on payment success**. |
| `stripe` | `STRIPE_SECRET_KEY` set | Real Stripe Checkout redirect + success-return session verification + optional webhook (`STRIPE_WEBHOOK_SECRET`), signature-checked. |

Fulfillment (render → host → submit to Prodigi) is triggered **only** after a
successful payment event, in both drivers.

## Run

```bash
PRODIGI_API_KEY=... npm install
PRODIGI_API_KEY=... npm start          # listens on :4123 (PORT to change)
npm test                               # astronomy + render + print-file audits
```

Environment:

| Var | Required | Purpose |
| --- | --- | --- |
| `PRODIGI_API_KEY` | yes | Prodigi key (sandbox key → sandbox API) |
| `PORT` | no | listen port (default 4123) |
| `PRODIGI_API_BASE` | no | override Prodigi base (live: `https://api.prodigi.com/v4.0`) |
| `BASE_URL` | no | public base URL for print files (else derived from request Host) |
| `STRIPE_SECRET_KEY` | no | enables the real Stripe Checkout driver |
| `STRIPE_WEBHOOK_SECRET` | no | enables/verifies `/webhooks/stripe` |
| `PRODIGI_CALLBACK_URL` | no | Prodigi order callbacks (recommended in production) |

## Test cards (sandbox checkout)

* `4242 4242 4242 4242` — approved
* `4000 0000 0000 0002` — declined
* `4000 0000 0000 9995` — insufficient funds
* any other Luhn-valid number — approved (demo gateway)

## Tests

* `tests/astro.test.mjs` — GMST known value, Polaris altitude ≈ latitude,
  Orion/Vega placement, projection edge cases, DST conversions.
* `tests/render.test.mjs` — edge-case designs render; text fit; PNG integrity.
* `tests/printfile.audit.mjs` — pixel audit of a real generated print file
  (ring, star field, typography bands, cardinal points, transparency).
* `tests/ascii.preview.mjs` — terminal visualization of a chart for eyeballing.
