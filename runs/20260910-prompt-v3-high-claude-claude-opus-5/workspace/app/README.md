# Flora Personalis

A t-shirt store where the product does not exist until somebody asks for it.

Give the site a **name, a date and a place**. Those three strings are hashed
into a seed, and the seed grows a plant: growth habit, leaf outline, leaf
margin, phyllotaxis, flower form, petal count, inflorescence, fruit, root
system, and an ink palette. The plant is composed into an antique herbarium
plate — rule frame, dissection column, scale bar, accession stamp and a typed
specimen label bearing a Latin binomial derived from the customer's own name —
and that plate is printed direct-to-garment as an edition of one.

The preview in the browser and the 300-dpi file the press receives come out of
the same drawing code, so what a customer approves is exactly what is pressed.

## Stack

| Concern | Choice |
| --- | --- |
| Framework | Next.js 15 (App Router) on Vercel |
| Artwork | Hand-written generative SVG (`lib/draw/*`), no drawing library |
| Rasterising | `@resvg/resvg-js` at 4665 × 5844 px — the Gildan 64000 front print area at 300 dpi |
| Payments | Stripe Checkout (hosted) + webhook |
| Fulfilment | Prodigi Print API v4 |
| Storage | None. A design is a base64url token; order state lives in Stripe session metadata |

## How an order flows

1. `/design` — the studio. The specimen is rendered client-side from the same
   `lib/draw` code the server uses.
2. `POST /api/quote` — prices delivery live from Prodigi for the destination
   country, before the customer pays.
3. `POST /api/checkout` — re-derives every price server-side, then creates a
   Stripe Checkout Session carrying the design token, the validated address and
   the absolute artwork URL in metadata.
4. Customer pays on Stripe's hosted page.
5. `POST /api/webhooks/stripe` — verifies the signature, and only for
   `payment_status === 'paid'` calls `fulfilSession()`, which posts the order to
   Prodigi with the Stripe session id as the idempotency key.
6. `GET /api/artwork?d=<token>` — Prodigi downloads the print file from here.
7. `/order?session_id=…` — confirmation, with live production status pulled back
   from Prodigi.

Nothing reaches the press before payment clears. Duplicate webhooks are
harmless: the session metadata is checked first, and Prodigi dedupes on the
idempotency key.

## Environment

```
STRIPE_SECRET_KEY=sk_…            # or rk_… restricted key
STRIPE_WEBHOOK_SECRET=whsec_…     # from the webhook endpoint you register
PRODIGI_API_KEY=…
PRODIGI_API_BASE=https://api.sandbox.prodigi.com/v4.0   # api.prodigi.com/v4.0 in production
NEXT_PUBLIC_SITE_URL=https://your-domain            # used for asset + return URLs
```

## Local development

```bash
npm install
npm run dev                    # http://localhost:3000
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Test card `4242 4242 4242 4242`, any future expiry, any CVC.

## Where the art lives

- `lib/rng.ts` — seeded PRNG; identical input always gives an identical plate.
- `lib/species.ts` — seed → taxonomy (genus, epithet, variety, authority,
  common name, accession) and morphology.
- `lib/draw/leaf.ts` — one parametric half-outline per leaf form, mirrored,
  with the margin applied as a modulation of the outline.
- `lib/draw/flower.ts` — six corolla forms, four fruit types, buds.
- `lib/draw/plant.ts` — recursive turtle. Leaves and flowers are drawn once into
  `<defs>` and instanced with `<use>`, and the plant measures its own bounding
  box so it always scales to fit the sheet.
- `lib/draw/plate.ts` — the herbarium sheet composition.
- `lib/draw/shirt.ts` — garment mock-up, drawn to the flat measurements of the
  shirt we actually sell.
