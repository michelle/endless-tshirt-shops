# datetime.store

A rebuild of [datetime.store](https://github.com/michelle/datetime.store): a shop that
sells one product — a t-shirt printed with the Unix millisecond timestamp of the
moment you bought it.

The original was Create React App + Express + Scalable Press. This is Next.js 15
(App Router) on Vercel, with **Stripe Checkout** for payment and the
**Prodigi Print API v4.0** for fulfilment.

## How it works

1. The store shows a live-ticking preview of the shirt.
2. On "Buy", `POST /api/checkout` mints the authoritative timestamp **server-side**
   and opens a Stripe Checkout Session carrying `{timestamp, size, fit, colour, ink}`
   in metadata. The clock on the page is only a preview — the real moment is the one
   the server stamps.
3. Stripe collects payment, shipping address and phone.
4. `checkout.session.completed` hits `/api/stripe/webhook`, which creates the Prodigi
   order pointing at `/api/art/{ink}/{timestamp}.png`.
5. Prodigi downloads that URL and prints it.

### Print artwork

Scalable Press accepted an uploaded artwork buffer; Prodigi instead **pulls artwork
from a URL**. So the print file is generated on demand and served publicly at
`/api/art/{white|black}/{timestamp}.png` — deterministic, immutably cached, and
regenerable forever from the timestamp alone.

Digits are drawn as seven-segment vector polygons in `lib/glyphs.ts`. That module is
shared by the browser preview (SVG) and the server renderer (rasterised PNG), so the
shirt on screen is a true preview of the shirt in the box. `lib/print-layout.ts` holds
the placement maths both sides use: an 8in-wide chest print sitting ~3in below the top
of the print area, matching the original's placement.

`lib/png.ts` is a dependency-free scanline rasteriser and PNG encoder (grey+alpha,
via Node's `zlib`). No `sharp`, `resvg` or `node-canvas`: the artwork is a few dozen
convex polygons, so a native image library would only add build fragility.

### Fulfilment and idempotency

`fulfil()` is called from two places: the Stripe webhook (primary) and the `/success`
page (fallback, so the store still prints shirts if webhooks aren't configured).
Both must therefore be safe to run twice. With no database:

- the Prodigi order id is written to the **PaymentIntent's metadata** and checked first;
- Prodigi also receives an **`idempotencyKey`** derived from the Stripe session id.

Prodigi's list endpoint ignores its `merchantReference` filter, so it is not usable
as a third check.

## Layout

```
app/
  page.tsx                       store front
  success/page.tsx               receipt + fulfilment fallback
  api/checkout/route.ts          mints the timestamp, opens Stripe Checkout
  api/stripe/webhook/route.ts    signature-verified fulfilment trigger
  api/art/[ink]/[ts]/route.ts    the print file
components/
  ShirtPreview.tsx               garment SVG + rAF-driven segment ticking
  StoreClient.tsx                fit / colour / size / buy
lib/
  glyphs.ts        seven-segment geometry (shared by preview and print)
  print-layout.ts  placement maths (shared by preview and print)
  png.ts           rasteriser + PNG encoder, no dependencies
  artwork.ts       timestamp -> print-ready PNG
  catalog.ts       the entire product catalogue
  prodigi.ts       Prodigi Print API v4.0 client
  fulfil.ts        idempotent Stripe session -> Prodigi order
```

## Local development

```bash
npm install
cp .env.example .env.local   # then fill in the keys
npm run dev
```

A `PRODIGI_API_KEY` beginning `test_` automatically targets the Prodigi sandbox.

Note that Prodigi must be able to *reach* the artwork URL, so orders placed from
`localhost` will fail asset download. Set `PUBLIC_BASE_URL` to a tunnel
(e.g. `stripe listen` + ngrok) if you need full local fulfilment.

## Product

Gildan 64000 Softstyle unisex tee (`GLOBAL-TEE-GIL-64000`), 8 colourways, S–3XL,
$22.50. Ink colour is derived from the garment: white on dark, black on light.
