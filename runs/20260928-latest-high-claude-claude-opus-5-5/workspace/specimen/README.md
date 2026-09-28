# SPECIMEN — one-of-one natural-history tees

Customers describe a person or pet. The store generates a unique moth, butterfly or beetle "field guide plate" for them
(Latin name, field notes, distinguishing marks, conservation status), and it's printed full-color on a tee (DTG) by Prodigi.

## How it works
- `lib/specimen.ts` is a deterministic SVG generator. The same code draws the browser preview and the print file.
- `lib/render.ts` rasterises it with resvg (4680×5790 transparent PNG = Prodigi front print area for GLOBAL-TEE-BC-3001).
- `POST /api/checkout` validates designs server-side, prices from `lib/catalog.ts`, and creates a Stripe Checkout Session.
  Each design is stored in its line item's product metadata, so no database is needed.
- `POST /api/webhooks/stripe` handles `checkout.session.completed` / `async_payment_succeeded`. For **paid** sessions only,
  it renders the prints, uploads them to Vercel Blob, and creates the Prodigi order (`idempotencyKey` = Checkout Session id).
  The Prodigi order id is saved on the PaymentIntent metadata.
- `GET /api/order` powers the order-status page. As a safety net, it retries fulfilment if a paid order has had no
  Prodigi order for 45s or more.

## Env vars
| Name | Purpose |
| --- | --- |
| `STRIPE_SECRET_KEY` | Stripe secret (or restricted) key |
| `STRIPE_WEBHOOK_SECRET` | Signing secret for the `/api/webhooks/stripe` endpoint |
| `PRODIGI_API_KEY` | Prodigi key |
| `PRODIGI_API_BASE` | Optional. Defaults to sandbox; set `https://api.prodigi.com/v4.0` for live |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob (public store) for print files |
| `SITE_URL` | Public base URL (Stripe product images, Prodigi callbacks) |

## Local dev
`vercel env pull .env.local && npm run dev`. To receive webhooks locally, run
`stripe listen --forward-to localhost:3000/api/webhooks/stripe` and use the printed secret.
