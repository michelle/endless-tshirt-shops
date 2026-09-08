# The Order of Small Disasters

A print-on-demand t-shirt store. Eight original hand-drawn "patron saint" medallions for
modern minor catastrophes — the unread inbox, the last two percent, the buttered side down —
printed to order through the [Prodigi](https://www.prodigi.com/print-api/) print API.

Next.js 16 (App Router) · TypeScript · no database · deployed on Vercel.

## Layout

```
data/saints.json      the eight saints — the single source of truth for copy
design/art.mjs        the artwork: SVG medallion generator (figure, relics, arc lettering)
design/mockup.mjs     vector flat-lay tee, one per colourway
design/render.mjs     rasterises print files, web art and mockups into public/
design/brand.mjs      favicon + Open Graph card
lib/catalog.ts        products, garments, sizes, retail price
lib/prodigi.ts        Prodigi v4 client (quotes, orders, order lookup)
lib/cart.ts           server-side cart re-pricing + compact encoding for Stripe metadata
lib/shipping.ts       live shipping quotes with a short in-memory cache
lib/orders.ts         address validation, Prodigi order assembly, idempotency keys
app/api/quote         POST — re-prices a cart and quotes shipping
app/api/checkout      POST — validates, quotes, then either starts Stripe or places the order
app/api/webhooks/stripe  POST — creates the print order once payment is confirmed
e2e.mjs               Playwright click-through of the whole purchase flow
```

## Regenerating the artwork

```bash
node design/render.mjs            # all eight, ~40s
node design/render.mjs <slug>     # just one, for iterating
node design/brand.mjs             # favicon + OG image
```

Rendering needs macOS system fonts (Copperplate, Baskerville). Output lands in
`public/print` (3600px transparent PNGs Prodigi downloads), `public/art` and `public/mock`.
Committed output means CI doesn't need the fonts.

## Environment

| Variable | Required | Notes |
| --- | --- | --- |
| `PRODIGI_API_KEY` | yes | Sandbox or live key |
| `PRODIGI_API_BASE` | no | Defaults to sandbox. Live: `https://api.prodigi.com/v4.0` |
| `NEXT_PUBLIC_SITE_URL` | no | Canonical origin for metadata/sitemap |
| `STRIPE_SECRET_KEY` | no | Present ⇒ checkout redirects to Stripe instead of placing directly |
| `STRIPE_WEBHOOK_SECRET` | with Stripe | Signature verification for the fulfilment webhook |

## Running

```bash
npm install
npm run dev
node e2e.mjs http://localhost:3000    # end-to-end purchase flow
```

## Money

Retail is $34.00 (`PRICE_CENTS` in `lib/catalog.ts`). Prodigi's item cost for the
Gildan 64000 is about $12.19; carrier shipping is quoted live at checkout and passed
through at cost. Prices are never taken from the client — `priceCart()` re-derives every
line from the catalogue on the server.
