# Lifeline Transit Co.

Custom t-shirts that map someone's life as a subway line: a route bullet, a line name, up to
eight "stops" (milestones), transfer bullets for the people who joined the route, and a dashed
"next stop". Every shirt is unique, which is what DTG printing is good at.

- **Product:** Bella+Canvas 3001 via Prodigi (`GLOBAL-TEE-BC-3001`), 7 colours, XS–4XL
- **Price:** $36 (+$3 for 2XL+), shipping priced live from Prodigi quotes (rounded up to the dollar)
- **Payments:** Stripe Checkout (hosted). Orders go to Prodigi only after Stripe reports `payment_status=paid`
- **Print file:** 4680 × 5790 px transparent PNG (Prodigi's front print area for this SKU), with black
  type for light shirts and white type for dark shirts. The artwork is auto-sized to ≤ 12" × 14.3" and
  centred at chest height

## How it fits together

```
public/            static storefront (vanilla JS modules, no build step)
  catalog.js       products, prices, colours, validation  ← shared by browser AND server
  design.js        design → SVG renderer                  ← shared: preview == print file
  metrics.js       glyph widths for text fitting (generated: npm run metrics)
api/               platform-neutral handlers (req/res)
  checkout.js      validate + re-price server-side → Stripe Checkout Session
  shipping.js      live Prodigi quotes → shipping options
  stripe-webhook.js  checkout.session.completed → fulfil (event re-fetched from Stripe to verify)
  order.js         order status page data; also triggers fulfilment (idempotent)
  print.js         signed URL → full-res PNG (resvg-wasm + bundled Inter Display fonts)
lib/orders.js      fulfilment: Stripe session metadata → Prodigi order (idempotencyKey = session id)
netlify/, netlify.toml, vercel.json   adapters/config for serverless hosting
scripts/server.mjs Node server for local dev / self-hosting
scripts/host.sh    self-host behind a Cloudflare quick tunnel
```

There's no database. The design lives in the Checkout Session metadata, the Prodigi order id is
written back to the PaymentIntent metadata, and print-file URLs carry the design inside them,
HMAC-signed so only the store can mint them.

## Run locally

```bash
npm install
STRIPE_SECRET_KEY=sk_test_... PRODIGI_API_KEY=... PRINT_SIGNING_SECRET=$(openssl rand -hex 32) npm start
# → http://localhost:3000
npm run render   # writes sample print files to ./out for visual QA
```

## Environment variables

| Name | Purpose |
| --- | --- |
| `STRIPE_SECRET_KEY` | Stripe secret (or restricted) key |
| `PRODIGI_API_KEY` | Prodigi API key |
| `PRODIGI_ENV` | `sandbox` (default) or `live` |
| `PRINT_SIGNING_SECRET` | HMAC secret for print-file URLs. **Keep it stable**: Prodigi fetches files by URL |
| `PUBLIC_BASE_URL` | Optional canonical URL (otherwise taken from the request host) |

`secrets.generated.js` is an optional fallback for hosts where env vars can't be set. It is gitignored and never served.

## Deploy to production (Netlify, recommended)

```bash
npx netlify-cli login
npx netlify-cli init            # or: sites:create
npx netlify-cli env:set STRIPE_SECRET_KEY sk_live_...
npx netlify-cli env:set PRODIGI_API_KEY ...   # live key
npx netlify-cli env:set PRODIGI_ENV live
npx netlify-cli env:set PRINT_SIGNING_SECRET "$(openssl rand -hex 32)"
npx netlify-cli deploy --prod --dir public --functions netlify/functions
```

Then add a Stripe webhook endpoint at `https://<your-domain>/api/stripe-webhook` for
`checkout.session.completed` and `checkout.session.async_payment_succeeded`.

Vercel also works (`vercel.json` + `api/`): `vercel --prod` and set the same env vars.
