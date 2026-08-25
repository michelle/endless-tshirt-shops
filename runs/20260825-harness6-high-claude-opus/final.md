Done. Here's the full report.

## 1. What I built and where it is

**https://benchmark-20260825-harness6-high-cl-dusky.vercel.app**

A production-shaped rebuild of datetime.store on Next.js 15 (App Router, TypeScript), Stripe Payment Elements, and the Prodigi Print API — replacing the original's Scalable Press flow.

The core experience is intact: a black tee whose printed number ticks in real time, two cuts (fitted/unisex) as flat blue chips that flip to black when chosen, `$30.00` struck through to `$22.50`, and "Congrats on your pretty cool shirt!" at the end. Press **Buy this millisecond** and the clock stops — that exact 13-digit epoch value is what gets printed.

What's new around that:

- **`GET /api/artwork/<epochMs>.png`** renders the print separation on demand — white Chivo digits on transparency, 3600×4800 px (12×16 in at 300 DPI), the number 8 in wide and 3 in down, verified by measuring the alpha bounding box (7.89 in × 0.70 in, centred). `lib/artwork.ts` drives both this and the on-site SVG preview, so mock-up and separation can't drift.
- **No database.** The PaymentIntent *is* the order record — shirt spec in metadata, Prodigi order id written back on fulfilment.
- **Idempotent fulfilment** with three layers: PI metadata fast path, an in-process promise map, and Prodigi's idempotency key (a repeat POST returns `AlreadyExists`).
- **`/api/health`** config self-check, `/order/[id]` status page gated on the payment's client secret, error boundary, generated favicon and OG image.

## 2. How to run and verify it

```bash
npm install && cp .env.example .env.local   # fill in keys
npm run dev
curl -s $URL/api/health | jq                # every check should be true
```

Buy one with `4242 4242 4242 4242`, any future expiry, any CVC.

I verified the deployed app with a headless-Chrome script driving the real checkout (Stripe iframes and all). The last run:

```
stamp ticking ✅ · frozen on click ✅
SUCCESS: Congrats on your pretty cool shirt!
receipt: 1787626519766 · $22.50 · pi_3U8AWJB3POJgri7000XXbykB · ord_1168848
console errors: none ✅
```

Seven payments, seven Prodigi orders, no duplicates. Prodigi reports `downloadAssets: Complete` on each, confirming it fetched the PNG. I also replayed a signed `payment_intent.succeeded` webhook against the live endpoint (200, no second order), and checked that bad and missing signatures return 400, that the client can't set the price, that stale/future timestamps are rejected (409/400), and that an order id without its client secret returns 403.

Locally, fulfilment deliberately refuses to run — Prodigi can't fetch `http://localhost`, so it errors clearly instead of creating an order with a dead asset.

## 3. What you need to do before real customers

1. **Swap in live keys.** `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, set `PRODIGI_ENV=live` with a live Prodigi key. The current Stripe sandbox (`acct_1U7xs6B3POJgri70`) **expires 2026-09-01** — claim it or replace it. The claim URL is in the CLI profile at `.benchmark-secrets/stripe/20260825-harness6-high-claude-opus.toml`.
2. **Recreate the webhook** against the live account, pointing at `/api/webhooks/stripe`, subscribed to `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`. Update `STRIPE_WEBHOOK_SECRET`.
3. **Register the domain for Apple Pay** (Stripe → Payment methods → Apple Pay). Google Pay and Link already work; Apple Pay won't appear until you do this.
4. **Check the margin.** Prodigi quoted ~$18.13 (item $12.27 + shipping $5.86) on a $22.50 sale with free shipping — roughly $4 gross before Stripe fees. Either raise the price or restrict `ALLOWED_COUNTRIES` in `lib/product.ts`, which currently spans 20 countries at one flat rate.
5. **Turn on Stripe email receipts** — the confirmation copy promises one.
6. **Set the statement descriptor and business name** in the Stripe dashboard.
7. **Order a sample.** Confirm the 8 in × 0.7 in print at 3 in from the print-area top actually lands where you want on both garments; `ART_WIDTH_IN` / `ART_TOP_IN` in `lib/artwork.ts` are the two knobs.
8. **Add refund handling.** The webhook logs `charge.refunded` but doesn't cancel the Prodigi order.
9. **Legal pages** — terms, privacy, returns.

## 4. Known limitations and assumptions

- **No rate limiting.** `/api/checkout` and the artwork rasteriser are open. I bounded artwork to timestamps within the last 2 years (so it isn't a free CPU faucet with 10¹³ cache keys), but real limits belong at the edge.
- **The express (wallet) path is code-complete but not end-to-end tested** — Apple/Google Pay sheets can't be driven headlessly. Card is fully exercised.
- **Stripe is the datastore.** No admin view, no order history, no email beyond Stripe's receipt. Fine for one product; it won't scale to a catalogue.
- **Prodigi's `merchantReference` filter is ignored by the API**, so the recovery lookup scans a bounded page. The idempotency key is the actual guarantee.
- **Fixed $22.50 regardless of destination**, no tax collection, no Stripe Tax.
- Sizes are S–2XL, black only, because that's the intersection both SKUs support.
- Deployed to **production** rather than a preview URL on purpose: preview deployments sit behind Vercel's protection, and Prodigi has to fetch the artwork from the public internet.

## 5. Decisions and why

- **Prodigi SKUs**: Bella + Canvas 6004 (women's "favourite" tee) for *fitted*, 3001 for *unisex* — the closest modern equivalents to the original's Next Level pair, and 6004 echoes the `bella-ladies-favorite-t-shirt` the author had commented out.
- **Server-rendered artwork instead of uploading a canvas dataURL.** Prodigi fetches assets from a URL asynchronously, so the design has to outlive the browser tab. Deriving it from the timestamp makes every URL deterministic, immutable and cacheable forever.
- **Freeze on click, not on payment.** The number you bought is the number you were looking at. The server re-checks it's under 30 minutes old and not in the future.
- **Wallets on top, card below** — the modern shape of the original's Payment Request Button plus "enter details manually".
- **Both Elements groups on automatic payment methods.** I initially pinned the card form to `card` only; the element still advertised Klarna and Bank, so anyone picking those would have hit a confirmation error. Matching both sides is the only safe configuration.
- **A plain email input instead of `LinkAuthenticationElement`.** Link sign-up arrives pre-ticked and makes a mobile number mandatory — a customer who fills in everything else gets blocked by "Your phone number is incomplete." I hit this in testing.
- **Address autocomplete off**, all fields visible — no Google Maps dependency, nothing hidden behind a search box on the one page that matters.
- **We render our own mock-up on the order page.** Prodigi's thumbnail is the separation itself — white ink on transparency — which displays as a blank white rectangle.

## 6. Friction worth knowing about

- **`stripe sandbox create` was rate-limited (429)** for about 15 minutes — the proof-of-work path failed and it fell back to a browser flow that can't complete non-interactively. A background retry loop got through on the second attempt after backing off. The provisioned key is a *restricted* key (`rkcs_test_…`): it can't read `/v1/account`, but it handles PaymentIntents, metadata writes and webhook endpoints, which is everything the app needs.
- **`vercel.json`'s `functions` block rejects App Router route handlers** ("doesn't match any Serverless Functions inside the `api` directory"), so per-route memory isn't configurable that way. Dropped it — the 3600×4800 rasterise runs in ~1.4 s warm on default memory.
- **Prodigi rejected the first live order** with `ValidationFailed` on `recipient.phoneNumber: ""`. Stripe returns `""` for skipped optional fields; Prodigi wants `null`. I also made the client surface Prodigi's per-field `failures` in error messages, because otherwise every bad order logs identically.
- **Puppeteer can't reach some Stripe iframes** — they're out-of-process and `frame.$` hangs for 30 s. Launching Chrome with `--disable-features=IsolateOrigins,site-per-process` fixed it. Also, `fullPage` screenshots silently don't paint cross-origin iframes, which briefly had me thinking the checkout was rendering blank.
- `next@15.5.4` carries a published advisory; pinned to `15.5.23`.
