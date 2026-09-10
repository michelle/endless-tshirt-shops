Everything's live and verified. Here's the summary.

## What I built

**Flora Personalis** — *"Every person is a species."* → **https://benchmark-20260910-prompt-v3-high-c-zeta.vercel.app**

You give it a **name, a date and a place**. Those three strings are hashed into a seed, and the seed grows a plant — growth habit, leaf outline, leaf margin, phyllotaxis, flower form, petal count, inflorescence, fruit, root system, ink palette. The plant is composed into an antique herbarium plate: rule frame, a numbered dissection column (corolla / folium / fructus / phyllotaxis diagram), scale bar, accession stamp, and a typewritten specimen label carrying a Latin binomial built from the customer's own name (`Rosalind Ferrer` → *Rosalindia vernalis* Ferrer var. *venusta*, "Dusky Valparaíso Ember").

The whole thing is drawn by hand-written generative SVG — no drawing library, no image models, no clip art. It's DTG-native rather than DTG-decorated: every print is an edition of one that could never be screen-printed, dark garments get a second light-ink palette so there's no white box behind the art, and preview and print file come out of the same code path.

## How to test it

1. Go to `/design`. Type a name, pick a date, type a place. The plate redraws live. Try the "Ada Lovelace / Yusuf Adeyemi / Marta Rossi" chips, and flip garment colours to see the ink set invert.
2. **Print proof ↗** opens the actual file the press receives (4665 × 5844 px, 300 dpi, transparent).
3. Continue to delivery → the shipping options are quoted live from Prodigi for your country (US shows $6.95 / $16.95).
4. Pay with `4242 4242 4242 4242`, any future expiry, any CVC. On Stripe's page you need to click **Card** — the adaptive layout doesn't preselect it.
5. The confirmation page shows the Prodigi order id and live production stage.

I ran two complete purchases through the deployed site with a real browser. Both produced Prodigi sandbox orders (`ord_1171364`, `ord_1171365`) with `downloadAssets: Complete`, asset status `Complete`, zero issues — meaning Prodigi actually fetched and accepted the 300-dpi print file. Bogus session ids return 404; unsigned webhooks return 400.

**Stripe sandbox** (expires 2026-09-17, unclaimed): claim at `https://dashboard.stripe.com/onboard_sandbox/YWNjdF8xVUU5clVMaW5Od000UHlYLDE3ODk2Njg0MTIv100v2aQqzPT`

## Gaps I know about

- **No sales tax / VAT.** Prodigi's own quote warns US sales tax may apply. You're currently under-collecting on every order. Turn on Stripe Tax before taking real money.
- **No database.** Order state lives in Stripe session metadata and the design lives in a URL token. It works and it's genuinely idempotent, but there's no admin view, no order history, no way to re-run a failed fulfilment in bulk.
- **No transactional email from us.** Stripe sends a payment receipt in live mode; there's no "your specimen is on its way" or dispatch email.
- **Fulfilment failure is soft.** If Prodigi rejects a paid order, the error is written to session metadata and the customer sees "held for review" — but nobody is alerted, and no refund is issued.
- **Content moderation is a blocklist.** `lib/moderation.ts` catches obvious slurs and abuse with whole-word matching (Scunthorpe and Penistone pass). It will not catch a determined bad actor putting something unpleasant on a shirt.
- **`/api/artwork` is public and unmetered.** Cached immutably at the CDN, but a first request costs ~2s of CPU and there's no rate limit.
- **Single product, single currency.** One SKU, USD only, no back print, no returns/refunds flow, no accessibility audit beyond semantic markup and labelled controls.

## To go to production

1. Claim the Stripe sandbox → activate a real account → swap `STRIPE_SECRET_KEY` for a live restricted key and re-register the webhook to get a live `whsec_`.
2. Switch `PRODIGI_API_BASE` to `https://api.prodigi.com/v4.0` with a live Prodigi key and add a payment method to that account — sandbox orders never actually print.
3. Enable **Stripe Tax** and set `automatic_tax` on the session, plus your tax registrations.
4. Add a real domain and set `NEXT_PUBLIC_SITE_URL` to it. Everything else follows from that variable.
5. Add persistence (Postgres or Vercel KV) for orders, plus an alert on `fulfilment_error` and a manual retry path.
6. **Order one on yourself before you sell one.** The colour work is calibrated on screen, not against actual DTG ink on cotton — the light-ink palettes on dark garments especially need a physical proof.

The code is in `app/`, with `README.md` covering the architecture and the art pipeline.
