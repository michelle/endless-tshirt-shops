# datetime.store

We sell one t-shirt: printed with the exact millisecond timestamp at the
moment you buy it. The number on the shirt ticks live on the homepage; the
instant you click "Buy," it freezes — that frozen millisecond is yours
forever, and nobody else can ever buy the same shirt.

This is a rebuild of the original [datetime.store](https://datetime.store)
(a Create React App + Stripe novelty shop) on a modern stack, with
[Prodigi](https://www.prodigi.com/print-api/) replacing Scalable Press for
print-on-demand fulfillment.

**Live demo:** https://benchmark-20260827-harness6-high-cl.vercel.app

## Stack

- **Next.js 16** (App Router, TypeScript, Tailwind CSS v4)
- **Stripe Checkout** (test mode) for payment — hosted, PCI-compliant,
  collects US shipping address + email in one step
- **Stripe webhooks** to trigger fulfillment once payment is confirmed
- **Prodigi Print API** (sandbox) for print-on-demand fulfillment — a
  Gildan 64000-series black tee, printed via `next/og` generated artwork
- No database: Stripe's `PaymentIntent.metadata` is the system of record
  for fulfillment status (see "How it works" below)

## How it works

1. `/` renders a live, client-ticking millisecond timestamp
   (`Date.now()`) on an SVG t-shirt mockup. The customer picks a style
   (Fitted / Unisex) and size (S/M/L/XL).
2. Clicking **Buy this exact moment** freezes the timestamp client-side and
   POSTs it to `POST /api/checkout`, which creates a Stripe Checkout
   Session (line item = $22.50 tee, free US shipping, metadata =
   `{ style, size, timestampMs, artworkUrl }`) and redirects to Stripe's
   hosted checkout page.
3. `GET /api/artwork?ts=…&style=…` renders the print-ready artwork (the
   frozen timestamp, transparent background) as a PNG using `next/og`.
   This URL is what Prodigi fetches for the shirt's front print area, and
   what's shown as the Stripe line-item image.
4. On successful payment, Stripe calls `POST /api/webhooks/stripe`
   (`checkout.session.completed`). The handler reads the shipping address
   Stripe collected, places an order with Prodigi's sandbox API
   (`POST /Orders`), and stores the resulting Prodigi order id back onto
   the Stripe `PaymentIntent`'s metadata.
5. `/success` reads the Checkout Session for the receipt, and polls
   `GET /api/order-status` (which reads the PaymentIntent metadata) to
   show live fulfillment status without needing a database.

## Running locally

```bash
npm install
cp .env.example .env.local   # fill in the values below
npm run dev
```

Required environment variables (see `.env.example`):

| Variable | Where to get it |
|---|---|
| `STRIPE_SECRET_KEY` | [Stripe Dashboard → API keys](https://dashboard.stripe.com/test/apikeys) (test mode) |
| `STRIPE_WEBHOOK_SECRET` | `stripe listen --forward-to localhost:3000/api/webhooks/stripe` (local) or a webhook endpoint you create for a deployed URL |
| `PRODIGI_API_KEY` | [Prodigi dashboard](https://dashboard.prodigi.com/) → sandbox API key |
| `PRODIGI_API_BASE_URL` | `https://api.sandbox.prodigi.com/v4.0` (sandbox) |
| `NEXT_PUBLIC_SITE_URL` | Your deployed URL, or `http://localhost:3000` |

To exercise the webhook locally, run `stripe listen --forward-to
localhost:3000/api/webhooks/stripe` in another terminal and use the
`whsec_…` it prints as `STRIPE_WEBHOOK_SECRET`.

## Verifying the deployed app

1. Visit the live URL — the shirt's number should be ticking.
2. Click **Buy this exact moment**, choose a style/size, and complete
   Stripe Checkout with test card `4242 4242 4242 4242`, any future
   expiry, any CVC, and any US shipping address.
3. You should land on `/success` showing your frozen timestamp and, within
   a few seconds, a green "Sent to print — Prodigi order `ord_…`" line.
4. That order id is a real object in Prodigi's **sandbox** — no physical
   order is placed and no card is charged for real (Stripe test mode).

## Deploying your own copy

```bash
vercel link --yes --project <your-project-name>
vercel env add STRIPE_SECRET_KEY production
vercel env add PRODIGI_API_KEY production
vercel env add PRODIGI_API_BASE_URL production
vercel env add NEXT_PUBLIC_SITE_URL production   # set to the URL Vercel gives you
vercel deploy --prod --yes
```

Then create the Stripe webhook once you know the deployed URL and add its
secret:

```bash
stripe webhook_endpoints create \
  --url "https://<your-domain>/api/webhooks/stripe" \
  --enabled-events checkout.session.completed
vercel env add STRIPE_WEBHOOK_SECRET production   # paste the whsec_… printed above
vercel deploy --prod --yes                        # redeploy so the secret takes effect
```

## Steps to take before selling to real customers

1. **Switch Stripe to live mode.** Replace `STRIPE_SECRET_KEY` with a
   `sk_live_…` key, and create a **live-mode** webhook endpoint (the one
   above is test mode) pointed at `/api/webhooks/stripe`, then set that
   `whsec_…` as `STRIPE_WEBHOOK_SECRET`.
2. **Get a production Prodigi account and API key**, switch
   `PRODIGI_API_BASE_URL` to `https://api.prodigi.com/v4.0`, and confirm
   your Prodigi billing/payment method is set up (Prodigi charges you
   wholesale per order).
3. **Send real order-confirmation emails.** Right now the confirmation
   message is just "check your email" — actual emails aren't sent. Wire up
   Stripe's built-in receipt emails (Dashboard → Settings → Emails) and/or
   a transactional provider (Resend, Postmark) triggered from the webhook.
4. **Handle fulfillment failures for real.** The webhook currently logs
   failures to `PaymentIntent` metadata and shows a "manual review" message
   on `/success`; add real alerting (Slack/email/Sentry) so a human
   actually sees and retries failed Prodigi orders.
5. **Increase artwork resolution.** `/api/artwork` renders at 1600×2000px;
   Prodigi's front print area for the Gildan 64000 is ~4665×5844px. Bump
   the `ImageResponse` dimensions (and consider swapping in the brand
   font's actual `.ttf` via `next/og`'s `fonts` option) for print-quality
   output.
6. **Add basic abuse protection** to `/api/checkout` (rate limiting,
   captcha, or a Stripe Radar rule) since it's an unauthenticated public
   endpoint that creates Checkout Sessions.
7. **Decide on international shipping.** Both Stripe shipping collection
   and the "Free shipping" rate are currently restricted to `US`, matching
   the original store; expand `allowed_countries` and Prodigi's
   `shippingMethod`/pricing if you want to sell elsewhere.
8. **Claim the Stripe sandbox** used during this build (or replace it with
   your own account) — see "Known limitations" below.

## Known limitations / assumptions

- **Stripe test sandbox is unclaimed and expires.** This project's Stripe
  keys came from `stripe sandbox create` (no browser login available in
  this environment) and expire **2026-09-04** unless claimed via the
  `claim_url` printed at creation time, or replaced with your own account's
  test keys.
- **No database.** Order/fulfillment state lives entirely in Stripe
  metadata. This is fine at this scale but won't scale to needing order
  search, admin tooling, refund workflows, etc. — add a real datastore
  (Postgres via Vercel, etc.) before that becomes a problem.
- **No transactional email is actually sent** (see above) — the UI implies
  one is coming, matching the original product's copy, but it's not wired
  up.
- **Artwork resolution is demo-quality**, not print-resolution (see above).
- **Style choice is cosmetic-plus-SKU.** "Fitted" maps to Prodigi's
  women's-cut tee (`GLOBAL-TEE-GIL-64000L`) and "Unisex" to the standard
  cut (`GLOBAL-TEE-GIL-64000`) — both black. Confirm this mapping matches
  your intended sizing chart before launch.
- **No automated tests.** Given the scope, I verified the flow manually
  (see `/api/checkout` → Stripe Checkout → webhook → Prodigi sandbox order,
  end to end) rather than writing a test suite.

## Decisions and why

- **Stripe Checkout (hosted) over custom Elements.** The original store
  built its own card form. A hosted Checkout Session is less code, PCI
  scope stays with Stripe, and it comes with Apple Pay/Google Pay, address
  collection, and 3DS handling for free — a better "credible production
  starting point" than reimplementing a payment form.
- **No database — Stripe as the system of record.** For a single-SKU store
  with no accounts, admin panel, or order history requirement, using
  `PaymentIntent.metadata` to track fulfillment status avoids standing up
  and securing a datastore while still supporting the "show live
  fulfillment status" requirement.
- **`next/og` for artwork instead of client canvas → server file.** The
  original captured a `<canvas>` snapshot client-side and uploaded it.
  Generating the artwork server-side from the same `ts`/`style` query
  params is simpler, can't be tampered with, and gives Prodigi a stable
  URL to fetch independently of the customer's browser session.
- **Literal millisecond epoch, not a formatted date.** The original
  product's joke is printing the raw `Date.now()` value, not a human date
  string — preserved here as the core "product truth" the whole site is
  built around.
- **Prodigi SKU `GLOBAL-TEE-GIL-64000` (+ `…L` for fitted), color black.**
  Confirmed against Prodigi's live sandbox catalogue (`GET
  /v4.0/products/…`) rather than guessed; chosen to match the original's
  black-tee aesthetic.

## Friction encountered

- The reference repo (`github.com/michelle/datetime.store`) has no
  README content beyond Create React App boilerplate — the actual product
  behavior (raw millisecond timestamp, live ticking, style/size options,
  $22.50 price, free US shipping, Stripe card + Apple/Google Pay) had to be
  reverse-engineered from the live site's compiled JS/CSS bundles.
- No interactive browser was available to log into Stripe, so I used
  `stripe sandbox create` (a CLI feature that provisions a claimable test
  account via proof-of-work, no login required) to get working test keys —
  documented above as a limitation since that sandbox is unclaimed and
  time-limited.
- Stripe's current hosted Checkout UI renders card fields as plain inputs
  in the top-level document (not a dedicated iframe) after expanding the
  "Card" accordion row — worth knowing if you automate testing against it.
