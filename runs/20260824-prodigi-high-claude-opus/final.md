Everything is deployed and verified.

## 1. What I built and the deployed URL

**https://benchmark-20260824-prodigi-high-cla-one.vercel.app** — Vercel project `benchmark-20260824-prodigi-high-claude-opus` (created fresh, name passed explicitly).

A rebuild of datetime.store on Next.js 15 / React 19 / TypeScript. The shirt shows a live epoch-millisecond clock that ticks until you pay; whatever it read the instant you paid is what gets printed. Both original SVG silhouettes (fitted/unisex), four sizes, $22.50 struck through from $30.00, Bootstrap-blue accents and floating labels carried over. Fulfillment is Prodigi instead of Scalable Press.

Three design decisions carry the whole thing:

- **Deferred intent creation.** Elements mounts with only `{mode, amount, currency}`; the PaymentIntent isn't created until you press Buy. So the timestamp is captured *at* payment, not at page load. The server re-checks it against its own clock (±10 min) so a tampered client can't order a shirt stamped 1969.
- **Artwork is a URL, not a file.** `/api/artwork?t=<ms>&format=print` renders the print asset on demand — white Chivo Bold on transparent, 2340×2895 px (Prodigi's 15.6×19.3in front area at 150 dpi). Pure function of `t`, so no blob storage, immutably cacheable, and Prodigi fetches it directly.
- **The PaymentIntent is the order database.** No DB. Style, size, timestamp, Prodigi order id and any fulfillment error live in PI metadata, so the Stripe dashboard *is* the order dashboard.

Fulfillment has two triggers (webhook primary, order page lazily) and is idempotent via a metadata short-circuit plus the PI id as Prodigi's `idempotencyKey`.

## 2. How to run and verify it

```bash
npm install && cp .env.example .env.local   # fill in, then
npm run dev
npm run typecheck
node scripts/verify.mjs https://benchmark-20260824-prodigi-high-cla-one.vercel.app
```

**40/40 checks pass against the live deployment.** The harness walks the real customer path — creates a PaymentIntent through our own endpoint, confirms with `pm_card_visa` + shipping address, lets the order endpoint drive fulfillment, then queries Prodigi directly to confirm SKU, size, color, recipient and an artwork URL bearing the right timestamp.

Verified beyond the harness:
- **Webhook-only fulfillment** — paid a shirt and never loaded the order page; `payment_intent.succeeded` alone placed `ord_1168673`.
- **Prodigi actually downloaded our artwork** — every order reports `asset status=Complete`, `issues=[]`, across both SKUs, sizes S/L/XL, and US + GB destinations.
- **Real browser** (Chrome via Playwright): clock ticks, Elements mount, Express Checkout renders Link/Klarna/Amazon Pay, pickers work, no page errors, no mobile overflow.

Live sandbox orders: `ord_1168672/73/74/75/76`. Unit economics from a live quote: cost $17.05 vs $22.50 → **$5.45/shirt**.

## 3. What you need to do before real customers

1. **Swap to live keys** — replace `STRIPE_SECRET_KEY` (currently a `rkcs_test_` sandbox restricted key) and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` with live ones; set `PRODIGI_ENVIRONMENT=live` and a live Prodigi key. **Fund your Prodigi account** — live orders fail without a payment method on file.
2. **Recreate the webhook** against live mode (`payment_intent.succeeded` → `/api/stripe-webhook`) and update `STRIPE_WEBHOOK_SECRET`. The test-mode endpoint `we_1U7qFA77TfOkKMK6E0NuDVsU` won't carry over.
3. **Keep Deployment Protection off** on whatever domain `PUBLIC_BASE_URL` points at — Prodigi fetches artwork anonymously. `GET /api/health?deep=1` reports `artwork.publiclyReachable`.
4. **Sales tax and VAT.** Prodigi's quote explicitly warns it excludes US sales tax; I charge a flat $22.50 with no tax. Wire up Stripe Tax before selling for real.
5. **Shipping economics.** Free worldwide shipping on a $5.45 margin is thin — Budget shipping is $4.78 to the US and more elsewhere. Either raise the price or restrict the 21-country allowlist in `lib/catalog.ts`.
6. **Legal + support** — terms, privacy, returns in the footer; a real support address. Refunds/reprints are manual (find the PI, look at `prodigi_order_id`).
7. **Alerting** on `metadata.fulfillment_error` — nothing currently pages you when a paid order fails to print.
8. **Order a sample** before launch. I verified the print file is geometrically correct but have never seen it on cotton.

## 4. Known limitations and assumptions

- **No database.** PI metadata caps at 500 chars/value and 50 keys — fine for one shirt, would need rethinking for carts or multi-item orders.
- **No order-history page.** A customer who loses the redirect URL can't look their order up; the client secret is the only credential.
- **No admin UI** — Stripe + Prodigi dashboards are the back office.
- **Redirect wallets untested end-to-end.** Card and Link work; Klarna/Amazon Pay are correctly wired (`return_url` present) but I couldn't complete their hosted flows headlessly.
- **Garment SKUs are my choice** (Bella+Canvas 6004 fitted, Gildan 64000 unisex, both black) — the original didn't specify.
- **`t` isn't uniqueness-enforced.** Two people could theoretically buy the same millisecond; the copy says "nobody else can," which is true in practice, not by constraint.
- **No git commit.** The working tree is complete but uncommitted — I don't commit unless asked.

## 5. Decisions and why

| Decision | Why |
|---|---|
| Deferred intent creation | The only way the printed timestamp is honestly "when you paid" rather than when you loaded the page |
| Artwork as a cacheable endpoint | Kills blob storage entirely; the print asset is a pure function of `t`, and Prodigi fetches it itself |
| PI metadata as the order record | A shop that needs a database to sell one SKU is over-built; this makes Stripe the order dashboard |
| Two fulfillment triggers | A shop that only prints when a webhook is wired is a shop that silently loses orders |
| Node runtime for artwork, not Edge | A 6.8-megapixel resvg render needs the memory; also let me read the font off disk |
| Express Checkout Element | The modern successor to the original's `paymentRequestButton`, and separate `Elements` groups so an untouched card form can't block a wallet payment |
| Split health into reachability vs. economics | Prodigi's `/quotes` fails independently of `/Orders` — we can still print while quoting is down, so a failed quote must not read as "shop is broken" |

Two fixes prompted by things I hit late: the confirmation page originally showed the raw print PNG, which rendered as a 700px-tall black rectangle — it now reuses the shirt SVG with the clock stopped on your millisecond. And Prodigi calls had no timeout, so a hanging upstream turned into a 504 on my own health endpoint; they now carry an 8s per-attempt timeout with one retry, which is safe because reads are reads and `POST /Orders` is idempotent.

## 6. Friction

- **Prodigi's `/quotes` and `/Orders` disagree on schema.** `merchantReference`, `sizing` and `assets[].url` are all valid on `/Orders` and rejected as `UnknownField` by `/quotes`. The quote payload has to be built separately.
- **Prodigi apparel SKUs aren't guessable.** Size and color are *attributes* on one SKU, not suffixes; every guess returned `EntityNotFound` until I scraped the product pages and confirmed via `GET /products/{sku}`.
- **`typescript@7` (tsgo) broke Next's tsconfig parsing**, which surfaced as `@/lib/*` failing to resolve. Adding `baseUrl` didn't help; downgrading to TS 5 did. Genuinely misleading symptom.
- **The `@vercel/og` font pattern is Edge-only.** `fetch(new URL('./x.ttf', import.meta.url))` throws `Failed to parse URL` on Node. Fixed by reading from `assets/` with `outputFileTracingIncludes` plus a CDN fallback.
- **`vercel project add` creates the project as framework "Other"**, so the first deploy built Next.js successfully and then failed with "No Output Directory named public". Fixed with `vercel.json`.
- **Prodigi sandbox `/quotes` had a real outage mid-verification** — persistent 503s, then hangs, then recovery at ~4.6s. This is what drove the health-check split and the timeouts.
- **`WebSearch` was unavailable** in this environment (`400 Web search is only supported for OpenAI models`), so all API research went through `WebFetch` and `curl`.
- Headless Chrome's `--screenshot` hangs on a page with a `requestAnimationFrame` loop; Playwright's bundled Chromium was SIGKILLed by macOS code signing. Using system Chrome via `channel: 'chrome'` worked. Note that full-page screenshots don't composite cross-origin iframes — the Express Checkout area looks blank in them, which sent me chasing a bug that didn't exist until I screenshotted the element directly.
