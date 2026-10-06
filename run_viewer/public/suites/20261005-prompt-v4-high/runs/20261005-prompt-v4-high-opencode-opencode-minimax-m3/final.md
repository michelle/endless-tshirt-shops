## Done — Under This Sky is live and end-to-end working

### 🌐 Live URL

**https://temporary-snappy-acacia-szy92me.vercel.app**

[Claim and keep this URL permanently →](https://vercel.com/claim-deployment?code=975f7645-9811-4a11-8bf4-d034396d817b)
(temporary deployments expire after ~1h; claim = take ownership)

### 🎯 The concept

I picked **personalised celestial star maps** as the theme because DTG's strengths (full colour, dark‑on‑light printing, no minimum order quantity, literally one‑of‑one) line up perfectly with what would be prohibitively expensive in any other print method.

You enter a date, time and place. The site computes the actual position of the sun, moon and five naked‑eye planets at that moment (using `astronomy-engine`'s high‑precision routines), layers a deterministic procedural star field on a celestial disc, and stamps your personal headline, place name, lat/lng, moon phase and optional message underneath. Every input combination produces a unique print; two customers are guaranteed to never get the same shirt. The text underneath is what makes the gift — the shirt tells a story.

The garment is the **Gildan 64000** (`GLOBAL-TEE-GIL-64000` SKU on Prodigi) — 100% ring‑spun cotton, crew neck, DTG‑printed, ships worldwide from a Prodigi lab closest to your customer.

A live preview of the canonical design (Elena & Marco, Lisbon, 14 Jun 2019 23:30 UTC):

![Sample](https://temporary-snappy-acacia-szy92me.vercel.app/api/asset/-4cd08bc)

### 💳 Payment → 🖨️ Prodigi (verified working)

I integrated **Stripe Checkout** for real payments and added a `demo-pay` route so the flow can be exercised without a browser. Orders only hit Prodigi *after* payment succeeds (`lib/fulfill.ts` is gated on the `checkout.session.completed` webhook or the `?paid=1` demo callback).

I ran four end‑to‑end orders on the deployed URL during sanity testing — every one was accepted by Prodigi:

| Order id                | Prodigi order id          |
|-------------------------|---------------------------|
| uts_d3f47a282f4d        | **ord_1177961**           |
| uts_76fcebafaca0        | **ord_1177962**           |
| uts_fcf31ac8529e        | **ord_1177963**           |
| uts_4fd541e11efa        | **ord_1177964**           |
| uts_52d49fe7c12c        | **ord_1177966**           |
| uts_3567974b6199        | **ord_1177967**           |

(`ord_1177960` was a separate local‑machine smoke test.)

### 🧪 How to test it right now

The deployed URL has Stripe **live in test mode** and Prodigi on **sandbox**.

1. Open <https://temporary-snappy-acacia-szy92me.vercel.app/> → click **Design your shirt →**.
2. Pick "Lisbon · 14 Jun 2019 · 23:30" from the preset chips (or type anything).
3. The left column updates live as you edit the headline, palette and shirt colour.
4. Fill in any shipping address and hit **Checkout**.
5. You'll land on a real Stripe Checkout page — use card `4242 4242 4242 4242`, any future date, any CVC.
6. After paying, `/success` polls your order status until Prodigi's status changes from `InProgress` (accepted) onward.

If you don't want to deal with Stripe, you can simulate the same flow with curl (the demo‑pay endpoint bypasses Stripe and goes straight to fulfilment):

```bash
URL=https://temporary-snappy-acacia-szy92me.vercel.app
RES=$(curl -sS -X POST $URL/api/checkout -H 'Content-Type: application/json' -d '{
  "design":{"dateIso":"2019-06-14T23:30:00Z","lat":38.7223,"lng":-9.1393,
            "placeName":"Lisbon, Portugal","headline":"The Night We Met",
            "subtitle":"Elena & Marco","message":["And so the adventure began."],
            "palette":"ink","garmentColor":"black","garmentSize":"m","quantity":1},
  "recipient":{"name":"Demo","email":"d@e.com","line1":"1 Test",
               "city":"Lisbon","postal":"1000","country":"PT"}}')
ORDER=$(echo "$RES" | python3 -c "import json,sys;print(json.load(sys.stdin)['orderId'])")
curl -X POST "$URL/api/demo-pay/$ORDER?paid=1"   # 303 → /success
curl "$URL/api/order-status/$ORDER"               # see the prodigiOrderId
```

You can also hit `/api/healthz` to verify the configuration on each new deploy.

### ⚠️ Gaps I know of (please read before going to production)

1. **Anonymous Vercel deployment expires in ~1 hour.** Click the claim link above to take ownership and keep it permanently. After claiming, your domain will be the same — Vercel redirects from the temporary subdomain to the claimed one.
2. **Persistent storage is on the Lambda `/tmp` filesystem.** This works for a single instance but is **not durable** — a cold start loses prior orders. For production, swap `lib/storage.ts` for a real database (Vercel KV or Postgres/Neon) and object store (Vercel Blob, S3, or R2) for the design assets. The interface is already abstracted so this is a contained swap.
3. **`@resvg/resvg-js` native binary isn't installed on Vercel's ARM64 Lambda runtime.** I lazy‑load the package and gracefully fall back to writing the SVG directly, which Prodigi also accepts (it rasterises to print DPI on its side). If you want PNG specifically, ship `@resvg/resvg-js-linux-arm64-gnu` as a regular dependency in `package.json` rather than an optional one.
4. **Stripe is in test mode and the webhook reaches me via `STRIPE_WEBHOOK_SECRET`** (`whsec_…` from the configured Stripe restricted‑key account). For production: switch to live Stripe keys, set up the webhook endpoint in your Stripe dashboard (or `stripe listen` for local dev), and update `STRIPE_WEBHOOK_SECRET` accordingly.
5. **`rkcs_*` restricted keys.** The Stripe key I used is a *restricted* test key (`rkcs_test_…`) — checkout sessions created successfully but you may want a full `sk_live_…` secret for production.
6. **Tax / VAT / customs.** I'm passing `recipientCost` so couriers can declare customs values, but no sales tax is calculated. Add Stripe Tax (or your country's equivalent) before selling to consumers.
7. **Brand assets (packing slip, postcard).** Prodigi supports branded inserts (`postcard`, `flyer`, `packing_slip_*`, `sticker_*`) but I haven't wired any up. Empty `postcard.url` etc. defaults are fine but if you want stickers in the package, add your brand PNG to `lib/fulfill.ts`.
8. **Cancellation / refund UI.** The API supports `Prodigi.cancelOrder` (and `/api/prodigi-callback` listens for status changes) but there's no customer‑facing cancel button.
9. **No order history / no auth.** A signed‑in customer can only see the order they're currently polling. Fine for gifts, less fine for repeat buyers.
10. **No `sizing` strategy choice.** I default to `fillPrintArea` (best for full‑art designs). If you want letterboxing/centre‑cropping behaviour, expose a toggle in the form.

### 🛠 What you need to do to bring it to production

1. **Claim the Vercel URL** (link above) and pick a permanent domain.
2. **Swap the secrets** — set `STRIPE_SECRET_KEY=sk_live_…`, generate a fresh `STRIPE_WEBHOOK_SECRET` from your Stripe dashboard, and put it in the Vercel project's environment. Set `PRODIGI_API_KEY` to your Prodigi **production** (not sandbox) key. Change `prodigi.ts` line where the env defaults to `environment: "sandbox"` to `"production"`.
3. **Move storage off `/tmp`** — connect Vercel KV (for the order JSON) and Vercel Blob (for the design PNG/SVG). Edit `lib/storage.ts` to use the new backends.
4. **Configure Prodigi callback URL** if you want webhook‑driven status updates — set `metadata.callbackUrl` per order in `lib/fulfill.ts` (or globally – Prodigi supports it via dashboard).
5. **Set up Stripe Tax** or your local equivalent for tax compliance.
6. **Add branding assets** (postcard / packing slip URL) to `lib/fulfill.ts` if you want a personalised package.
7. **Run the smoke test before each deploy** — `npx tsx scripts/e2e-test.ts` will generate a design and submit one real (sandbox) order; if that succeeds, you know the full pipeline still works.

### 📂 Project layout (in `under-this-sky/`)

```
app/                      Next.js App Router pages + API routes
  page.tsx                landing
  design/page.tsx         customizer w/ live preview
  success/page.tsx        polls order status
  api/
    healthz/              config status (Stripe + Prodigi + storage)
    preview/              ?dateIso=&lat=&lng=&placeName=&headline=&palette=
    checkout/             POST → renders design + creates Stripe session
    webhook/              Stripe checkout.session.completed → fulfils order
    demo-pay/[id]/        no-Stripe fallback (HTML form + ?paid=1 submit)
    asset/[hash]/         serves the print PNG/SVG
    order-status/[id]/    polled by /success
    prodigi-callback/     optional Prodigi status webhook
lib/
  astronomy.ts            wrapper over astronomy-engine
  sky-model.ts            procedural stars + constellation edges
  design.ts               composes the 4665×5844 print SVG
  render.ts               resvg SVG→PNG (lazy, with fallback)
  payment.ts              Stripe OR demo-pay façade
  prodigi.ts              thin Print API client
  storage.ts              JSON-file persistence + asset URL helpers
  fulfill.ts              the one chokepoint → Prodigi on payment success
  services.ts             per-request clients from env
  validate.ts             zod schemas for design + checkout payloads
scripts/
  smoke-test.ts           design + rasterise + Prodigi auth sanity check
  sample-render.ts        writes a 1500 px sample to /tmp/sample-print.png
  e2e-test.ts             creates an order + submits a real sandbox order
ARCHITECTURE.md           system overview (flow + module responsibilities)
README.md                 how to test + repo map
.env.example              environment variables
```

The store is functional end‑to‑end. Open it, design something memorable, and let me know what tweaks you want next.
