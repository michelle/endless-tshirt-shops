# Under This Sky — custom star-map t-shirts

Every shirt is a one-of-one: the exact night sky (1,600+ stars, all 88
constellation figures, J2000 precession, local sidereal time, true timezone
handling) above the customer's chosen place and moment, rendered to a
4680×5790 px / 300 DPI print file and DTG-printed on a Bella+Canvas 3001 tee.

## Flow

1. Customer designs their shirt in the live customizer (`public/` — vanilla JS,
   shared isomorphic renderer `public/starmap.js`).
2. **Stripe Checkout** takes payment (`POST /api/checkout` creates the session;
   design params travel as an HMAC-signed token in session metadata).
3. Stripe delivers `checkout.session.completed` to `POST /api/stripe/webhook`
   (signature verified, raw body). **Only then** is the order sent to
   **Prodigi** (`server/prodigi.js`, SKU `GLOBAL-TEE-BC-3001`, attributes
   size+color, front print asset).
4. Prodigi fetches the print PNG from `GET /api/design/:token.png` — a public,
   signed, cached endpoint that rasterizes the same SVG the customer previewed
   (via `@resvg/resvg-js` with bundled Cormorant Garamond fonts).

## Run

```sh
npm install
node scripts/build-catalog.mjs   # regenerate public/catalog.json from data/
export STRIPE_SECRET_KEY=... STRIPE_PUBLISHABLE_KEY=... \
       STRIPE_WEBHOOK_SECRET=... ART_SIGNING_SECRET=... PRODIGI_API_KEY=...
PUBLIC_URL=https://your-domain PORT=8787 node server/index.js
```

`run.sh` does the above, sourcing `~/.tshirt-secrets/stripe.env` plus
`.env.local` overrides (gitignored).

## Test

```sh
node scripts/test-render.mjs     # sample print renders -> out/
STORE_URL=http://localhost:8787 node scripts/e2e.mjs   # full purchase via Playwright (Stripe test card)
```

Stripe test card: `4242 4242 4242 4242`, any future expiry, any CVC.

## Layout

- `public/` — storefront (index, app.js, starmap.js, catalog.json, success page)
- `server/` — Express app: checkout, webhook→Prodigi fulfillment, signed PNG endpoint, tz resolution
- `data/` — d3-celestial source catalogs (Yale Bright Star / constellation lines)
- `fonts/` — TTFs embedded into the print render
- `scripts/` — catalog build, render test, Playwright E2E
