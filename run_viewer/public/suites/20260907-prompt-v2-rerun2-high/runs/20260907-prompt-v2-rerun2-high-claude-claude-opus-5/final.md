The store is live and verified end-to-end.

## 🔗 https://benchmark-20260907-prompt-v2-rerun2-gamma.vercel.app

**The Order of Small Disasters** — eight original "patron saint" medallions for modern minor catastrophes. St. Vera of the Unread Inbox, St. Odile of the Last Two Percent, St. Bartholomew of the Buttered Side Down, St. Junia of the Unpaired Sock, St. Cassian of the Reply-All, St. Marguerite of the Spinning Wheel, St. Aldous of the Forgotten Password, St. Fenwick of the Untraceable Smell. Each is a devotional engraving — halo, sunburst, relic held in both hands — with the saint's name and an invocation line ("*Invoked at 4:57 on a Friday, when the number will not go down*").

The artwork is generated, not stock: `design/art.mjs` builds each plate as SVG (figure, per-saint relic, glyph-by-glyph arc lettering, since librsvg has no `<textPath>`), rasterised to 3600px transparent PNGs for DTG and composited onto vector flat-lay tee mockups for the eight colourways.

## How to test it

1. **Browse** the eight saints, open one, switch colours and sizes.
2. **Add to cart**, adjust quantities.
3. **Checkout** — pick a country and watch the shipping line re-quote live from Prodigi; try switching US → United Kingdom, or Budget → Express.
4. **Place order** (nothing is charged) — you land on an order page that reads live status back from Prodigi.
5. `node e2e.mjs https://benchmark-20260907-prompt-v2-rerun2-gamma.vercel.app` runs the whole flow in a browser.

I placed four real sandbox orders. The last one (`ord_1170971`) shows `downloadAssets: Complete`, zero issues — Prodigi successfully fetched and accepted our print files from the deployed domain.

**Prices are server-authoritative.** `priceCart()` re-derives every line from the catalogue; posting `unitCents: 1` still returns $34.00. Shipping is re-quoted server-side on submit, so the client can't spoof a total.

## Gaps you need to close

1. **No payments.** No Stripe key was available. The Stripe path is written and wired — `/api/checkout` creates a Checkout Session when `STRIPE_SECRET_KEY` is set, and `/api/webhooks/stripe` places the print order only after `checkout.session.completed` with a verified signature and a session-keyed idempotency key. It has never executed. Set the keys, register the webhook, and test with Stripe's test cards before trusting it.
2. **Prodigi is in sandbox.** Swap `PRODIGI_API_BASE` to `https://api.prodigi.com/v4.0` and a live key. Order a sample of each design first — I've verified the files are technically accepted, never that ink on cotton looks right.
3. **No order database.** Prodigi is the system of record; `/orders/[id]` reads from their API. Consequence: after a Stripe redirect the customer sees a generic "payment received" page, because nothing maps a session to a Prodigi order ID. Add a table (Postgres/KV) writing on checkout and on webhook.
4. **No email.** No confirmation, no shipping notification. Needs a provider plus Prodigi's order-status webhook.
5. **No sales tax / VAT.** Prodigi's US quotes carry a `UsSalesTaxWarning`; we charge shipping at cost and nothing else. You need tax calculation before selling in the US or EU.
6. **Range is deliberately narrowed.** I found that maroon and forest green don't ship to the US at all, and XS/3XL are patchy — a US customer could have hit a dead end at checkout. The range is now eight colours × S–2XL, verified so that every combination reaches all 37 offered countries (`node /tmp/verify.mjs` logic, data in `data/availability.json`). `lib/availability.ts` also blocks unfulfillable combinations server-side with a message naming the alternatives. Re-run `design/fetch-availability.mjs` whenever you change the range.
7. **Smaller things:** shipping quotes take 3–4s from Prodigi (cached 5 min per warm instance); an unknown order ID renders a friendly page but returns HTTP 200; no rate limiting on the order endpoint; the returns policy in `/legal` is placeholder text a lawyer should see.

Margin: $34.00 retail against ~$12.19 Prodigi cost, shipping passed through at cost.
