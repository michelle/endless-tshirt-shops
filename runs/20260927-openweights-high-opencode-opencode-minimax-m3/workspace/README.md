# GNOMON — a sundial for your moment

A direct-to-garment t-shirt store where **every shirt is one of one**. The
buyer enters a moment (place + UTC date/time) and a short inscription. The
shop renders a vintage sundial plate from the actual sun geometry at that
moment — declination, hour angle, gnomon shadow — and prints it onto a
Bella+Canvas 3001 cotton tee via Prodigi.

## Demo store

`https://benchmark-20260927-openweights-high-opencode-opencode-minimax-m3.vercel.app`

## Stack

- **Next.js 14** (App Router) on **Vercel**
- **Stripe Checkout** for payments (with a frictionless demo branch when no
  Stripe key is configured)
- **Prodigi Print API v4** for DTG print + global shipping
  (`GLOBAL-TEE-BC-3001`, 4680×5790 px front print at 300 DPI)
- **@resvg/resvg-js** to convert each customer's SVG sundial into a print-ready
  PNG, computed on demand — no asset CDN required for a single-tenant deploy.

## Local dev

```sh
npm install
cp .env.example .env.local
# add your sandbox keys to .env.local (PRODIGI_API_KEY is mandatory; STRIPE_SECRET_KEY optional)
npm run dev
```

Visit `http://localhost:3000`. Without `STRIPE_SECRET_KEY` the buy button
takes you to `/demo-checkout`, which fires the same fulfillment flow as the
real webhook (the Prodigi sandbox `ord_...` is real).

## Project structure

```
app/
  page.tsx                # storefront, customization form, live preview
  success/page.tsx        # post-payment receipt + Prodigi status poller
  order/page.tsx          # track an existing order by session id
  demo-checkout/page.tsx  # stand-in for Stripe Checkout in demo mode
  api/
    preview/route.ts      # POST: live preview PNG (low-res, fast)
    glyph/[token]/route.ts# GET: at-prodigi-print-resolution PNG, signed
    checkout/route.ts     # POST: Stripe Checkout (or demo redirect)
    webhook/route.ts      # POST: Stripe → satisfy → send to Prodigi
    demo-pay/route.ts     # POST: same as webhook, but for the demo path
    order-status/route.ts # GET: pulls current Prodigi stage for a session
lib/
  sundial.ts              # solar-position math (NOAA-derived)
  render.ts               # SVG → 300 DPI PNG
  tokens.ts               # HMAC-signed design token (small; not a DB)
  stripe.ts               # Stripe SDK + Checkout session helpers
  prodigi.ts              # Prodigi sandbox/live client
  fulfill.ts              # the only function that creates Prodigi orders
```

## How the payment-first gate works

1. Buyer configures the shirt on `/`. The live preview hits `POST /api/preview`
   which runs the same renderer used at print time, just at a smaller size for
   speed.
2. Buy → `POST /api/checkout`. The server signs the customization with HMAC
   and creates a Stripe Checkout session. Stripe receives the design_token in
   `payment_intent_data.metadata` plus the address fields Stripe will collect.
3. Stripe redirects to `/success?session_id=…`.
4. Stripe's webhook (`POST /api/webhook`) fires; we verify the signature,
   reconstruct the customization from metadata (and re-verify the HMAC), and
   call `fulfillPaidOrder()`. **Only this function** calls `createProdigiOrder`.
5. `/success` polls Prodigi every few seconds; once the order is in
   `InProgress`/`Complete` we show details + the live prodigi dashboard link.

The demo branch replaces path 2 with a hosted `/demo-checkout` page and path 4
with `POST /api/demo-pay`. Both call the exact same `fulfillPaidOrder()`.

## Test it

1. Open the storefront URL.
2. Edit phrase/place/time and watch the preview regenerate (≈ 220 ms debounce).
3. Click **Buy this shirt**. If no Stripe key is loaded, you'll land on the
   demo checkout; otherwise Stripe's hosted page.
4. Pay with `4242 4242 4242 4242`, any future expiry, any CVC/ZIP, address of
   your choice.
5. Redirected to `/success` — the Prodigi order is forming in real time.
   The status block polls every few seconds. The page keeps refreshing the
   status until it lands on `Complete`.
6. The Prodigi sandbox dashboard
   (`https://sandbox-beta-dashboard.pwinty.com/orders/{ordId}`) shows the
   full timeline: download assets → production → shipment.

## Known gaps (and how to close them)

- **No order database.** Tracking works off the Stripe `session.id` (also used
  as Prodigi's `merchantReference`). For order history, customer accounts, and
  email receipts, swap to Vercel Postgres (KV is too simple for the
  search-by-email cases).
- **Asset URL is server-rendered on demand.** Prodigi only fetches each
  asset once, so the Next.js route serving the PNG is fine for low volume. At
  thousands of orders/day you'd want a CDN or Vercel Blob so the asset URL
  doesn't depend on this function staying alive.
- **The sundial is computed, not astronomical-data-driven.** The plate is
  drawn from solar position only — there is no actual star database lookup.
  Marketing shouldn't claim "the sky" because that's not what it is.
- **Default `shippingMethod` is `Standard`.** Prodigi offers Budget/Express/
  Overnight; expose them as a shipping-method picker once you've got Stripe
  Tax wired in.
- **No taxes.** Stripe Tax is off. Prodigi's quote excludes US sales tax.
- **Printable asset is 300 DPI but uses Georgia/serif.** It looks good but
  never replaces a typography pass — once this is real, swap Georgia for a
  bespoke engraved display face.

## To bring it to production

1. **Stripe:** create a Stripe account, get live keys. Set
   `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, and `STRIPE_WEBHOOK_SECRET`
   in Vercel env. Configure the webhook to deliver
   `checkout.session.completed` to `https://<your-domain>/api/webhook`.
   Enable Stripe Tax and set your business details.
2. **Prodigi:** copy the dashboard's *Live* API key into
   `PRODIGI_API_KEY` and flip `PRODIGI_BASE_URL` to
   `https://api.prodigi.com/v4.0`. Place one self-test order before going live.
3. **Domain & emails:** attach a custom domain. Add Resend/SES for order
   confirmation and shipping-tracks emails. Add `next.config` headers to
   cover Stripe's CSP needs.
4. **Persistence:** add a database (Vercel Postgres is fine) for
   `Order{id, stripeSessionId, prodigiOrderId, status, recipient,
   customization}`. The HMAC token stays as a fast-lookup side path while
   the user is mid-checkout.
5. **Observability:** add Sentry (or your choice). The webhook handler
   returns 500 on Prodigi errors so Stripe retries — verify this with a
   test decline.

## Why "GNOMON"?

A gnomon is the vertical stick of a sundial; its shadow *is* the time. We
asked every buyer the same thing a sundial does — *when are you, and where?*
— and made the answer the artwork.
