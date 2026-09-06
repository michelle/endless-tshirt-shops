# Automata Supply

A t-shirt store that sells elementary cellular automata. Pick one of the 256
rules and a seed; the site evolves the automaton, renders it at print
resolution, and has it printed to order.

## How it works

Every design is a pure function of five values — `rule`, `seed`, `seeding`,
`cells`, `ink` — so the same URL always produces the same artwork. There is no
image storage and no product database: the catalogue is code, and the artwork is
generated on request.

| Path | Purpose |
| --- | --- |
| `lib/ca.ts` | The automaton itself: rule lookup, seeding, evolution on a ring |
| `lib/png.ts` | Dependency-free indexed-colour PNG encoder (`zlib` only) |
| `lib/font.ts` | 5x7 bitmap font for the caption, drawn on the same grid |
| `lib/render.ts` | Composites lattice + caption into a print-area canvas |
| `lib/catalog.ts` | The eight curated rules, pricing, size upcharges |
| `lib/fulfil.ts` | Paid Stripe session → Prodigi print order |
| `app/api/art` | Browser preview PNG (`?w=`, `&bare=1`, `&bg=rrggbb`) |
| `app/api/print` | The 3000x3758 asset Prodigi downloads and prints |

Prints are transparent-ground, so only live cells take ink and the garment
colour shows through everywhere else.

## Order flow

1. `POST /api/checkout` decodes each cart line, **recomputes the price
   server-side**, and creates a Stripe Checkout Session. The cart is stored in
   session metadata, chunked to stay under Stripe's 500-character limit.
2. Stripe collects payment, shipping address and shipping tier.
3. `POST /api/webhooks/stripe` verifies the signature, re-fetches the session,
   and calls `fulfilSession`, which submits a Prodigi order and writes the
   Prodigi order id back to the PaymentIntent's metadata.
4. `/order?session_id=...` shows the result. It also calls `fulfilSession`
   itself, so a slow webhook does not leave the customer staring at "pending".

Fulfilment is idempotent twice over: the PaymentIntent metadata is checked
before printing, and the Prodigi request carries an `Idempotency-Key` of the
Stripe session id.

## Local development

    npm install
    cp .env.example .env.local     # fill in the three required keys
    npm run dev

To exercise the webhook locally:

    stripe listen --forward-to localhost:3000/api/webhooks/stripe

Note that Prodigi fetches the print asset over the internet, so orders placed
against `localhost` will be rejected at the printer. Set `NEXT_PUBLIC_SITE_URL`
to a public tunnel if you need the full loop locally.

## Going live

- Swap `STRIPE_SECRET_KEY` for a live key and re-point the webhook endpoint.
- Set `PRODIGI_API_BASE=https://api.prodigi.com/v4.0` and use a live Prodigi key.
- Sandbox Prodigi orders are never actually produced or shipped.
