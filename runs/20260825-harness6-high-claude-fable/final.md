Everything is built, deployed, and verified end-to-end. Final report:

---

## 1. What I built and where it runs

**Live store:** https://benchmark-20260825-harness6-high-cl-orcin.vercel.app
(Vercel project `benchmark-20260825-harness6-high-claude-fable`, newly created for this run)

A faithful rebuild of datetime.store — "we sell a t-shirt with the current datetime." The landing page shows a black tee with a live-ticking Unix-millisecond timestamp on the chest, fitted/unisex styles, sizes S–XL, $22.50 (struck from $30), free shipping. Clicking **Buy now** freezes the timestamp — that exact millisecond is the product — and opens Stripe embedded Checkout in-page. After payment, a webhook places a print order with Prodigi, and the success page shows "Congrats on your pretty cool shirt!" with the frozen timestamp and the print order id.

Stack: Next.js 15 (App Router, TypeScript) on Vercel · Stripe embedded Checkout (`ui_mode: embedded_page`) · Prodigi Print API v4 (sandbox). One clever bit: since the timestamp *is* the design, the print file is rendered deterministically on demand by an edge route (`/api/artwork?ts=...` — satori + Chivo Bold, 2000×460 white-on-transparent PNG ≈ 250 DPI at the 8″ print width). Prodigi fetches it by URL, so there's no image storage and no database anywhere — the Prodigi order id is written back to the Stripe PaymentIntent's metadata as the idempotency/fulfillment record.

## 2. How to run and verify

**Verify the deployed flow:** open the URL, pick a style/size, click Buy, and pay with Stripe's test card `4242 4242 4242 4242` (any future expiry/CVC, a US address). You'll land on `/success` showing your frozen timestamp and, within seconds, a Prodigi order id. Check it with `curl -H "X-API-Key: $PRODIGI_API_KEY" https://api.sandbox.prodigi.com/v4.0/Orders/<ord_id>`.

I verified this exact flow with a headless-browser test (`e2e/buy.mjs`, screenshots in `/tmp/dtshots/`): payment `paid` at $22.50 → webhook fired → Prodigi order **ord_1168854** created with the correct SKU (Bella+Canvas 3001, black, size L), the customer's address, and the artwork URL. A minute later Prodigi reported `downloadAssets: Complete`, `printReadyAssetsPrepared: Complete`, and the order **InProduction** — the whole pipeline works, including their lab fetching the print file.

**Run locally:** source is in `store/` (git repo, committed), with a README covering `npm run dev`, env vars, `stripe listen` for webhooks, and deploy steps.

## 3. Steps to get ready for real customers

1. **Claim the Stripe sandbox** (it expires 2026-09-01): run `stripe sandbox claim` or open the claim URL printed at provisioning (`https://dashboard.stripe.com/onboard_sandbox/YWNjdF8xVTd1U0U1QVFRN1pGQXlaLDE3ODgyMzQzNjQv100gAWmZZxd`), complete Stripe activation, then swap `STRIPE_SECRET_KEY` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` for live keys and re-register the webhook (live mode) into `STRIPE_WEBHOOK_SECRET`.
2. **Prodigi production**: get a live API key, set `PRODIGI_API_KEY` and `PRODIGI_API_URL=https://api.prodigi.com/v4.0`, and add billing details in the Prodigi dashboard.
3. **Rethink the price**: fulfillment quotes at ~$18.40 (US, standard shipping) against a $22.50 price — after Stripe fees that's roughly break-even domestically and **negative for most international orders**. Raise the price, drop free shipping, or trim the 19-country shipping list.
4. **Tax**: enable Stripe Tax (`automatic_tax`) — US sales tax is currently not collected (Prodigi's quote API warns about this too).
5. **Domain + emails**: point a real domain at the Vercel project; enable Stripe's customer receipt emails, and consider Prodigi callbacks for "your shirt shipped" notifications.
6. **Boilerplate**: terms, privacy, and returns pages (print-on-demand returns policy especially).

## 4. Known limitations and assumptions

- **Card-only checkout** (deliberate — see decisions). Apple/Google Pay, Link, Klarna are off.
- **No database**: Stripe is the source of truth. Fine at this scale; add persistence if you want an admin/orders view.
- The success-page fallback fulfiller (kicks in if the webhook hasn't fulfilled 45 s after session creation) has a theoretical race with a very late webhook retry that could double-order; the metadata check makes this window tiny but not atomic.
- The artwork endpoint is public and deterministic — anyone can render a PNG for any timestamp. Harmless (it's just digits) and required so Prodigi can fetch it.
- One shirt per checkout, quantity 1, S–XL only, black only — matching the original product.
- Sandbox orders don't actually print or charge; Prodigi sandbox simulates the production pipeline.

## 5. Decisions and why

- **Embedded Stripe Checkout instead of the original's Payment Request Button + custom card form**: keeps the original's single-page feel while getting SCA, address validation, and receipt handling for free; the original's hand-rolled `stripe.charges.create` flow is deprecated practice.
- **Timestamp frozen client-side at the Buy click**, passed through session metadata — preserving the original's core conceit (the moment of *decision* is what you buy), with the shirt preview switching to a frozen "your moment" state during checkout.
- **Server-rendered deterministic artwork** replaces the original's client-canvas `toDataURL()` upload — the print file is reproducible, high-res (250 DPI vs. the original's screen-res canvas), and can't be tampered with by the client.
- **Prodigi SKU mapping**: fitted → Bella+Canvas 6004 (the modern equivalent of the original's Scalable Press "bella-ladies-favorite-t-shirt"), unisex → Bella+Canvas 3001; both validated against the sandbox catalogue and quote API before writing the integration.
- **Card-only payments**: Stripe Link's popup window repeatedly hijacked the embedded flow (an overlay blocks the whole form until the popup is resolved). Restricting to `payment_method_types: ['card']` matches the original store and makes checkout deterministic.
- **Webhook-primary, success-page-fallback fulfillment** with idempotency via PaymentIntent metadata — survives webhook misconfiguration without needing a database.

## 6. Friction encountered

- The claimable Stripe sandbox key is permission-restricted (e.g. `balance retrieve` is blocked), which made initial key validation misleading — checkout/webhook APIs all work fine.
- The sandbox's API version (`2026-07-29.dahlia`) renamed `ui_mode: 'embedded'` → `'embedded_page'`, and stripe-js v9 renamed `initEmbeddedCheckout` → `createEmbeddedCheckoutPage`; both surfaced only through probing the SDK types.
- The GitHub reference README was Create-React-App boilerplate; I had to clone and read the source to recover the product behavior.
- Stripe Link aggressively injected itself into the embedded checkout during automated testing (popup + form-blocking overlay, and its "save my information" default makes phone number required) — the largest time sink, solved by going card-only and filling the phone field.
- Minor: port 3100 was occupied by an unrelated process, and Vercel deploy output printed guidance JSON instead of the URL once (recovered via `vercel ls`).
