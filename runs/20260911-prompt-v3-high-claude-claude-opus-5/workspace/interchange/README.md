# Interchange

**Your life is a network. Wear the map.**

A t-shirt store where the product is generated, not picked. The customer names
the lines of their life (Childhood, Work, Love, Bad Decisions), types the stops
on each one, and a layout engine draws a proper octilinear transit map — routed
track, interchange rings, solved label placement, legend, serial number. That
map is then printed edge to edge on a Gildan 64000 via Prodigi's
direct-to-garment presses.

Nothing about this product can be pre-made. There is no catalogue, no stock, no
screen. That is the point: DTG is the only process where a run of one costs the
same per shirt as a run of a thousand, so the artwork can be generated at the
moment of payment and printed once, ever.

---

## Architecture

```
customer -> /design ------ POST /api/preview -----> SVG (same renderer as print)
                    \
                     `-- POST /api/checkout ------> Stripe Checkout   (if keys set)
                                                or  /pay/<token>      (sandbox simulator)

payment succeeds
   Stripe: POST /api/stripe/webhook  (signature verified)  ┐
           + GET  /api/order/<ref>?session_id=...          ├─> fulfil() -> Prodigi order
   Sandbox: POST /api/demo/pay                             ┘

Prodigi -> GET /api/art/<signed-token>.png  (4680x5790, transparent, 300 DPI)
```

### The design is the database

There are no persistence primitives to provision. A design is a plain JSON
`Spec`; it is deflated, HMAC-signed with `APP_SECRET` and carried as a token.

* **Artwork URLs** (`/api/art/<token>.png`) are that token. The endpoint decodes
  it, re-runs the deterministic renderer and streams a 300 DPI PNG. The same
  input always produces the same shirt, so artwork never has to be stored.
* **Checkout** carries the token in Stripe session metadata (chunked across
  numbered keys, since Stripe caps values at 500 characters) or inside the
  signed sandbox checkout link.
* **Order lookup** asks Prodigi. Our order reference is the Prodigi
  `merchantReference`, and the artwork URL stored on the Prodigi order decodes
  back into the original design, which is how the status page can show the
  shirt you bought.

Every token is signed, so a customer cannot hand-edit a design into a cheaper or
different shirt after payment.

### Fulfilment safety

Shirts are sent to Prodigi **only after payment succeeds**:

* Stripe path: the webhook verifies the signature with
  `stripe.webhooks.constructEvent` and refuses to act unless
  `payment_status === "paid"`.
* Sandbox path: the card authorisation must return `ok` first.

`fulfil()` is idempotent. It asks Prodigi whether an order with this merchant
reference already exists before creating one, and passes the reference as
`X-Idempotency-Key`. Stripe webhook retries, a customer refreshing the success
page, and a double-submitted sandbox form all converge on one print job.

Fulfilment runs from **both** the webhook and the order status page, so the
store still works before a webhook endpoint has been registered.

---

## The layout engine (`lib/layout.ts`)

1. **Routes.** Each line follows a hand-tuned normalised skeleton (four network
   variants the customer can shuffle through), jittered by a seed derived from
   the design itself, then connected octilinearly — every segment is horizontal,
   vertical or exactly 45°, with rounded corners.
2. **Interchanges.** If a stop name appears on more than one line, the earlier
   line's node becomes a mandatory waypoint for the later one, so the two routes
   physically meet and the shared stop is drawn as a ring instead of a tick.
3. **Termini.** Routes are trimmed back to just past their first and last stop,
   then the whole network is uniformly rescaled to fill the print area (uniform
   scaling keeps every angle octilinear).
4. **Labels.** Eight candidate placements per stop, scored against other labels,
   other stops, the track itself and the artboard edge, longest labels first,
   with a bias towards horizontal text because it reads better on a body.

Text is converted to outlines with `opentype.js` against a bundled copy of Inter
(OFL), so rendering never depends on fonts being installed wherever the
rasteriser runs, and the preview is pixel-identical to the print file.

---

## Running it

```bash
npm install
cp .env.example .env.local     # fill in PRODIGI_API_KEY and APP_SECRET
npm run dev
```

`node --import tsx scripts/preview.ts` renders sample designs to `out/` as PNGs
if you want to iterate on the artwork without the store around it.

## Payments

The store integrates **Stripe Checkout**. If `STRIPE_SECRET_KEY` is present it
is used; if not, the store falls back to a built-in sandbox card simulator so
the whole pipeline stays exercisable. `/api/health` tells you which is live.

To switch to Stripe:

```bash
./scripts/enable-stripe.sh sk_test_xxx whsec_xxx
```

The webhook endpoint is `POST /api/stripe/webhook` and should be subscribed to
`checkout.session.completed` and `checkout.session.async_payment_succeeded`.

## Going live with printing

Set `PRODIGI_API_BASE=https://api.prodigi.com/v4.0` and supply a live Prodigi
API key. Nothing else changes.
