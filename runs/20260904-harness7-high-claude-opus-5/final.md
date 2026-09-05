Everything is live and verified.

## 1. What I built

**https://benchmark-20260904-harness7-high-cl-livid.vercel.app**

A rebuild of datetime.store on Next.js 15 / React 19 / TypeScript, deployed to the new Vercel project `benchmark-20260904-harness7-high-claude-opus-5`. Same product: a black tee printed with the Unix millisecond timestamp of the instant you hit buy. The number runs live off `requestAnimationFrame` until you commit, then freezes — that frozen value is what gets printed. Original's cornflower/black palette, Chivo type, both shirt silhouettes, and the `$30.00 → $22.50` badge are carried over.

Stripe hosted Checkout handles payment; Prodigi replaces Scalable Press for fulfillment.

**Verified end to end, three real purchases through the deployed app** (Playwright driving the actual Stripe Checkout page with card `4242…`):

| Prodigi order | SKU | Size | Assets | Issues |
|---|---|---|---|---|
| `ord_1170402` | `GLOBAL-TEE-GIL-64000` (unisex) | L | Complete | 0 |
| `ord_1170403` | `GLOBAL-TEE-GIL-64000L` (fitted) | S | Complete | 0 |
| `ord_1170404` | `GLOBAL-TEE-GIL-64000` | XL | Complete | 0 |

`downloadAssets: Complete` is the load-bearing result — Prodigi reached our artwork URL over the public internet and accepted the file.

## 2. How to run and verify it

```bash
npm install && cp .env.example .env.local   # fill in values
npm run dev
stripe listen --forward-to localhost:3000/api/webhooks/stripe   # second terminal
npm test        # 10 tests: validation, catalogue mapping, print geometry
npm run build   # type-checks everything
curl localhost:3000/api/health
```

Buy a shirt with `4242 4242 4242 4242`, then check the Prodigi order — `status.details.downloadAssets: "Complete"` proves the whole chain. Full detail in `README.md`.

## 3. What you need to do before real customers

1. **Claim the Stripe sandbox — it expires 2026-09-12.** Account `acct_1UC85QRRWwqthcPN`; run `stripe sandbox claim`. Then swap in live keys, create a live webhook endpoint for `/api/webhooks/stripe`, and set its `whsec_` as `STRIPE_WEBHOOK_SECRET`.
2. **Set `PRODIGI_ENV=live`** with a live Prodigi key. Only the exact string `live` sends real orders — that's deliberate.
3. **Re-check the margin.** Prodigi quotes $12.17 item + $4.73 shipping = **$16.90** to a US address. At $22.50 with free shipping that's ~$4.65 after Stripe fees. The original's pricing, but verify it against your actual destination mix before launch.
4. **Order one sample shirt** and look at the real print. The geometry is derived from Prodigi's reported print area, not from a physical proof.
5. **Point a real domain at it** and set `PUBLIC_BASE_URL`. Note Prodigi must be able to fetch artwork from that host — do not put it behind auth.
6. **Add order-confirmation email.** Stripe sends a payment receipt; nothing sends a "your shirt is printing" email with the Prodigi order id.
7. **Add Prodigi status callbacks** (`callbackUrl` on the order) for shipping/tracking updates.
8. Set up **Stripe Tax** if you have nexus, and decide your **returns policy** — the fine print currently says misprints/damage only.

## 4. Limitations and assumptions

- **No database.** Order state lives in Stripe PaymentIntent metadata (`prodigi_order_id`) plus Prodigi. Fine at this scale; you'd want a real store for reporting or a customer order history.
- **No admin view.** Failed fulfillments write the error to PaymentIntent metadata and surface as "needs attention" to the buyer, but nothing alerts you. Wire this into Sentry or similar.
- **Black only, S–XL, one design.** Prodigi carries more colors and sizes; `lib/catalog.ts` is where you'd extend.
- **Shipping is a flat free rate** into 24 countries. Prodigi's real cost varies by destination; this is a pricing choice inherited from the original, not a computed rate.
- **Print aspect is pinned to the US lab** (4665×5844). An EU-routed order crops ~5.7% per side under `fillPrintArea`; the text sits within the middle 72%, so it's safe — but re-verify if you widen the design.
- **Stripe sandbox key is restricted** (`rkcs_test_…`); `/v1/account` and `/v1/balance` are denied. Nothing the app needs.

## 5. Key decisions

- **Hosted Stripe Checkout over Elements.** The original hand-rolled a card form plus a Payment Request button for Apple Pay. Hosted Checkout preserves that one-tap wallet intent while adding Link, SCA, address validation and localization, and keeps card data off our origin entirely.
- **Artwork is a pure function of the URL.** `/api/artwork/<ts>.png` renders deterministically via Satori, so the URL *is* the design. Prodigi pulls assets from a URL, which eliminates the upload step, the blob store, and the original's `designId` round-trip with its retry loop. It also means reprints work forever.
- **Two fulfillment paths, one idempotent function.** Webhook is primary; the status endpoint the confirmation page polls is a backstop, so a misconfigured webhook can't cost a buyer their shirt. Guarded by the recorded order id *and* Prodigi's `idempotencyKey` (the Stripe session id). Verified: webhook plus four status polls produced exactly one order.
- **Server decides price and SKU.** The client sends only timestamp/style/size, all re-validated. Checkout additionally requires a *recent* moment so nobody hand-crafts a back-dated shirt — while `parseTimestamp` stays permissive so old orders' artwork keeps rendering.

## 6. Friction worth flagging

- **Prodigi's `merchantReference` query filter is silently ignored.** `/v4.0/Orders?merchantReference=X` returns the most recent orders regardless — I confirmed a nonexistent reference returns someone else's order. Trusting it would have handed back a stranger's order in the recovery path. `lib/prodigi.ts` now pages and matches client-side.
- **Vercel didn't detect the framework** on first deploy. The build ran `next build` and succeeded, but the project had `framework: null`, so routing config was never applied and every route 404'd on a "successful" deployment. Fixed by pinning `framework: "nextjs"` in `vercel.json` — worth committing rather than relying on dashboard state.
- **Deployment Protection was on by default**, which would have blocked both Stripe webhooks and Prodigi's asset fetch. Disabled for this project via the Vercel API.
- **`force-static` route handlers silently drop search params.** The preview mockup rendered the unisex shirt for `?style=fitted` requests. Moved style into the path.
- Port 3000 was held by a leftover server from a previous run — I used 3010 and left that process alone.
- Two minor notes: the Stripe CLI prefixes JSON output with a plugin hint line that breaks piping into a parser, and Node 20 doesn't support `--experimental-strip-types`, so tests compile through the existing `tsc` rather than adding a dependency.
