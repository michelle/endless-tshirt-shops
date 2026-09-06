Everything is deployed and verified end to end.

## 🔗 https://benchmark-20260906-clean-sheet-high-rosy.vercel.app

**Automata Supply** — t-shirts printed with elementary cellular automata. The niche: anyone who's ever been nerd-sniped by Rule 30. Each shirt is a real automaton evolved at print resolution — Rule 110 (Turing complete), Rule 90 (draws the Sierpiński triangle from one live cell), Rule 184 (models traffic jams). Eight curated rules plus a designer that opens up all 256 rules × 16⁶ seeds.

The artwork is generated from scratch: I wrote a dependency-free indexed-PNG encoder (`lib/png.ts`, `zlib` only) and a 5×7 bitmap font, so the caption is drawn on the same cell grid as the art. Prints are transparent-ground, so only live cells take ink and the garment colour shows through — which is what DTG actually reproduces well.

### How to test it

Browse the catalog → pick a garment/ink/size → add to cart → checkout with Stripe test card **4242 4242 4242 4242**, any future expiry, any CVC, any address. You'll land on an order page showing the live Prodigi print-order status.

Two things worth trying: `/design` (drag the rule slider — it warns you if a combination dies out or fills in solid), and hitting the raw print asset Prodigi consumes:
`/api/print?rule=30&seed=000001&seeding=single&ink=bone&cells=141` → a 3000×3758 PNG, 46KB, ~130ms.

### What I verified, not just built

I ran two complete purchases through the real hosted Stripe Checkout. The second produced Prodigi order `ord_1170722` with correct SKU, colour, size, address, and shipping tier — and the Vercel logs confirm the **webhook** did the fulfilment, not the fallback.

The first purchase exposed a real bug: it created **two** Prodigi orders. The webhook and the order page raced, and I'd assumed Prodigi honoured an `Idempotency-Key` header. It doesn't — I tested both `Idempotency-Key` and `X-Idempotency-Key` and each cheerfully created a second order. Fixed by querying `GET /Orders?merchantReferences=<session_id>` before creating, plus a 45s grace window where the order page defers to the webhook. Re-tested with 5 concurrent order-page hits: exactly one order.

Also confirmed: prices are recomputed server-side from the decoded design (nothing about money is trusted from the browser), malformed cart payloads return 400s, and unsigned webhook posts are rejected.

### Gaps you should know about

- **Sandbox only.** Prodigi sandbox orders are never physically produced. Go live by swapping `PRODIGI_API_BASE` to `https://api.prodigi.com/v4.0` with a live key, and a live Stripe key + new webhook endpoint.
- **The Stripe sandbox expires 2026-09-13** and is unclaimed. Run `stripe sandbox claim` to keep it.
- **No database.** Order state lives in Stripe metadata and Prodigi. That's genuinely fine at this scale, but there's no order-history page and no email beyond Stripe's receipt.
- **No tax collection.** `automatic_tax` needs an origin address configured on the Stripe account. Prodigi's quote flagged that US sales tax may apply — currently unhandled.
- **Shipping is flat-rate** ($5.95/$16.95) rather than quoted per-destination from Prodigi. Margin is healthy — Prodigi quoted $16.99 landed for a US order against $43.95 retail — but it will be thin on some international routes.
- **Five junk sandbox orders** exist from my duplicate bug and idempotency probes (`ord_1170716`, `1170718`–`1170721`). Prodigi wouldn't let me cancel them once `InProgress`. Harmless, but they're in the sandbox order list.
- One cosmetic oddity: Stripe's `pending_webhooks` counter still reads 1 for that event even though the endpoint verifiably returns 200 in 0.49s. I believe it's a counter artifact rather than a delivery failure, but I didn't fully chase it down.

### What you need to do next

1. Claim the Stripe sandbox before 2026-09-13, or wire in your own keys.
2. Decide on tax handling before taking real money.
3. If going live: real keys, real Prodigi base URL, and order a sample shirt of a single-cell rule first — the wrap-around rules like Rule 90 look great on screen, but I'd want eyes on how the fine 3px cells hold up under actual DTG before selling them.
