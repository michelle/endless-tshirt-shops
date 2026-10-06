# HEADLINER — your life, as a tour shirt

A print-on-demand store for one product: a concert-style "tour" tee where the
tour is *your* life. The customer names the tour, lists the dates (cities,
moments, people), picks a shirt colour and ink, and we typeset it like an
authentic tour shirt: left-chest logo on the front, full date list on the back.
Every shirt is unique, text-only, flat colour, transparent background: exactly
what direct-to-garment printing does best.

## Stack

- Node 20+/Express, no framework, no build step.
- Design engine: `server/design.js` lays out SVG with real font metrics
  (opentype.js), so text always fits. `server/render.js` rasterises it with
  resvg to a transparent 4680x5790 PNG, the exact print area of the
  Bella+Canvas 3001 on Prodigi (`GLOBAL-TEE-BC-3001`, front + back areas).
- Payments: Stripe Checkout (hosted). Shipping address + phone collected by
  Stripe. Flat $6.95 shipping.
- Fulfilment: Stripe webhook `checkout.session.completed` (and the async
  variants) -> verify signature -> re-fetch the session from Stripe and check
  `payment_status === 'paid'` -> render print files -> `POST /orders` on the
  Prodigi API with `idempotencyKey = session id`. The success page also asks the
  server to verify the session with Stripe, so a missed webhook still fulfils.
  Nothing is ever sent to Prodigi before Stripe says the money is in.
- Storage: `data/db.json` (designs + orders). Print files in `data/prints/`.
- Hosting (pilot): the server runs on this Mac under launchd and is exposed via
  a Cloudflare quick tunnel. `bin/tunnel.sh` restarts the tunnel if it drops and
  re-points the Stripe webhook endpoint at the new hostname.

## Run locally

```
cp ~/.tshirt-secrets/stripe.env .env   # or fill in the keys below
echo PRODIGI_API_KEY=... >> .env
npm install
npm start                               # http://localhost:4242
```

`.env` keys: `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY` (unused server-side),
`PRODIGI_API_KEY`, `PRODIGI_API_BASE` (sandbox by default), `PORT`, and
optionally `APP_URL` + `STRIPE_WEBHOOK_SECRET` if you host it somewhere fixed.
With a tunnel, `bin/set-public-url.js <https-url>` writes those to
`data/runtime.json` and creates/updates the Stripe webhook endpoint for you.

## Operate the pilot deployment

```
cat data/runtime.json                 # current public URL + webhook id
tail -f data/logs/server.log data/logs/tunnel.log
launchctl kickstart -k gui/$(id -u)/com.headliner.server   # restart server
launchctl kickstart -k gui/$(id -u)/com.headliner.tunnel   # restart tunnel (new URL)
launchctl bootout gui/$(id -u)/com.headliner.server; launchctl bootout gui/$(id -u)/com.headliner.tunnel   # stop everything
```
The plists live in `launchd/` and are copied to `~/Library/LaunchAgents/`.

## Test a purchase

1. Open the public URL, pick a preset, edit the dates, hit **Buy this shirt**.
2. On Stripe Checkout use card `4242 4242 4242 4242`, any future expiry, any
   CVC, any address in a supported country.
3. You land on `/success`, which shows the Prodigi order id and stage within a
   few seconds and the two print proofs.
4. Check Prodigi: `GET https://api.sandbox.prodigi.com/v4.0/orders/<id>`.

## API

- `GET  /api/catalog` colours, inks, sizes, layouts, prices
- `POST /api/preview {design, area, width}` -> PNG (what you see is the print file)
- `POST /api/checkout {design}` -> `{url}` Stripe Checkout
- `POST /api/stripe/webhook` Stripe events (raw body, signed)
- `GET  /api/orders/by-session/:cs_id` order status for the success page
- `POST /api/prodigi/callback` Prodigi status updates
- `GET  /prints/<order>-<area>.png` print files fetched by Prodigi

## Going to production

See the handover notes in the chat / `PRODUCTION.md`.
