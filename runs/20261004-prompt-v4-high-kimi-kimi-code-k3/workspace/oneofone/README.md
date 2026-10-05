# ONE/OF/ONE — generative one-of-one t-shirts

Every shirt is a **one-of-one artwork grown from the customer's word** — a perfect
fit for DTG, where every print can be different. Type a word, the field engine
(seed = the word + palette) grows a unique flow-field artwork, carves the word
through it as negative space, and stamps it "EDITION 1 OF 1" with its edition
number. Printed on a Bella+Canvas 3001 and shipped by Prodigi.

## Architecture

```
public/            storefront (customizer + live preview) and order-status page
server.js          Express app: design API, checkout, payment callbacks, fulfillment
src/art.js         generative art engine (seeded PRNG -> simplex flow field -> SVG)
src/prng.js        xmur3/sfc32 PRNG + seeded simplex noise
src/palettes.js    curated ink palettes per shirt color
src/render.js      SVG -> 4680x5790 (300dpi) transparent PNG via headless Chromium
                   (same engine as the live preview: what you see is what prints)
src/paygate.js     PayGate PayWeb3 hosted-card checkout (ACTIVE sandbox driver)
src/stripeDriver.js Stripe Checkout + webhook verification (production-ready)
src/btcpay.js      BTCPay Greenfield driver (alternative sandbox)
src/payu.js        PayU hosted checkout driver (alternative sandbox)
src/prodigi.js     Prodigi Print API v4 client (sandbox)
src/db.js          tiny JSON-file store (orders, designs, config)
test/paygate-flow.js  full E2E: order -> hosted card payment -> 3DS -> Prodigi verify
test/shots.js      storefront screenshot QA
```

## Flow

1. Customer types a word → `/api/design.svg` renders the artwork live on a shirt mockup.
2. Checkout form → `POST /api/orders` → server initiates a PayGate transaction and the
   browser is sent to PayGate's hosted card page (3D Secure included).
3. After payment, PayGate redirects the browser **and** server-to-server notifies
   `/webhooks/paygate`. The server confirms the transaction independently with
   `query.trans` (source of truth) — **only `TRANSACTION_STATUS=1` marks an order paid.**
4. Exactly-once fulfillment: the 300dpi PNG is rendered/cached and a Prodigi order is
   created with the public image URL, customer address, size and shirt color.
5. `/order/:id` shows live payment + Prodigi production status (polls + Prodigi callbacks).

## Payment drivers

Selected by `paymentDriver` in `data/config.json`: `paygate` (active), `stripe`,
`btcpay`, `payu`. Stripe is the intended production driver — set `stripe.secretKey` /
`stripe.webhookSecret` and flip the driver; no code changes needed.

## Run

```bash
npm install
npx playwright install chromium   # used for PNG rasterization
export PRODIGI_API_KEY=...
npm start                          # serves on :3000
npm run tunnel                     # cloudflared quick tunnel -> public URL
```

Set `publicUrl` in `data/config.json` to the public URL so callbacks point back correctly.

## E2E test

```bash
# create an order via the API, then drive a real browser through PayGate's
# hosted checkout with the sandbox test card 4000 0000 0000 0002:
node test/paygate-flow.js "$(curl -s -X POST $PUBLIC/api/orders -H 'Content-Type: application/json' -d '{...}')" $PUBLIC
# decline path: CARD=5200000000000023 node test/paygate-flow.js ...  (must not fulfill)
```
