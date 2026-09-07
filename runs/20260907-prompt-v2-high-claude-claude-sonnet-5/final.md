Built and deployed. Here's the rundown.

## What it is
**Night Shift Cryptids** — an original t‑shirt brand: six folklore cryptids working thankless overnight jobs (Bigfoot as a graveyard-shift barista, Mothman on night security, Nessie doing 24-hr IT support, Chupacabra as a late-night DJ, Yeti on the overnight stock crew, Jackalope as a night-shift nurse). Each is a hand-coded SVG "patch" badge, rasterized to PNG at build time — no stock art or external image APIs. Unisex tees, 3 colors × 5 sizes, $32.

**Stack:** Next.js 16 (App Router, TypeScript, Tailwind v4), deployed on Vercel. Cart is client-side (React context + localStorage). Checkout collects shipping info + a clearly-labeled mock card form, then calls a server route that places a **real order against the Prodigi sandbox Print API** (SKU `GLOBAL-TEE-GIL-64000`, Gildan 64000 unisex tee), with the design's high-res PNG as the front print asset.

## Live site
- **https://benchmark-20260907-prompt-v2-high-c-eight.vercel.app** (public alias — use this one)
- The raw per-deploy URL (`...-e629ie9u7.vercel.app`) returns 302 behind Vercel's deployment protection; the alias bypasses that, so share/test with the alias.
- Vercel project: `benchmark-20260907-prompt-v2-high-claude-claude-sonnet-5`

## How to test
1. Browse `/shop`, open a product, pick a color/size, add to cart.
2. Go to `/cart` → `/checkout`, fill in any shipping address (try a real-looking US address), pick Standard/Express, enter anything in the card fields (never transmitted), submit.
3. You'll land on `/checkout/success` with a real Prodigi sandbox order ID.
4. **I already verified this end-to-end for you**, twice: an order I placed against the live deployment (`ord_1170901`) was picked up by Prodigi, its print asset downloaded and validated successfully (`downloadAssets: Complete`, item status `Ok`, no quality issues) — the full pipeline works. One of those test orders used your email address (`analogmidnight@gmail.com`) as the sandbox recipient email to validate the flow; it's a sandbox order so no real shipment/communication goes out, but flagging it since I didn't ask first.

## Known gaps before real production use
- **No real payment capture.** Checkout is honest about this in the UI, but there's no Stripe/PSP integration — anyone can "place an order" and it creates a real Prodigi sandbox job. Must add real payment before switching to Prodigi's live key.
- **No order persistence.** Order confirmation lives in `sessionStorage` only; refresh/close the tab and it's gone. No database, no order history/account.
- **No emails sent.** The success page says "confirmation sent" but nothing actually emails the customer.
- **Flat-rate shipping, no tax.** Shipping is a hardcoded $6.95/$14.95, not a live Prodigi quote; no sales tax.
- **No webhook/status sync.** Order status is only ever the initial "InProgress" response — no polling or Prodigi webhook to update the customer.
- **No abuse protection** on the checkout API (no rate limiting/captcha).
- Art is original but hand-built by me from primitives, not a designer's work — worth a design pass if this is a real brand.

## Next steps to go to production
1. Add Stripe (or similar), require successful payment before calling `/api/checkout`.
2. Swap `PRODIGI_API_KEY` for a production key and base URL (`api.prodigi.com`), after confirming payment is wired up.
3. Add a database for orders + a Prodigi webhook/poll to update fulfillment status, plus real confirmation emails (Resend/Postmark).
4. Replace flat shipping with Prodigi's quote endpoint; add tax calculation.
5. Decide on Vercel deployment protection settings and attach a real domain.
6. Add basic rate limiting on the checkout route, plus terms/privacy/returns pages.
