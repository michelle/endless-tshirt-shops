Live and verified end to end.

**https://benchmark-20260905-beauty-high-clau-gold.vercel.app**

## What it is

One product: a t-shirt printed with the exact millisecond you press the button. You choose one of **five dialects** for writing that moment down — Epoch ms, ISO 8601, Longhand English, Swatch Beats, or 32-bit Binary — plus fit, size, one of four colourways, and postage. Press **Freeze this moment**, the clock stops mid-tick, a rubber stamp lands on the shirt, and the on-shirt preview swaps to the *actual print file* the printer will receive.

The one composition function in `src/lib/dialects.ts` feeds both the live 60fps browser preview and the 4680px print renderer, so the preview cannot lie about what gets printed.

## How to test it

1. Open the site, pick a dialect / colour / fit, press **Freeze this moment**.
2. Scroll to the checkout. Enter any email, a shipping address, and card `4242 4242 4242 4242`, any future expiry, any CVC.
3. You land on `/order/[id]` — order ref, the frozen moment, and the Prodigi print-job id once accepted. "Download the print file" gives you the real 4680px transparent PNG.

Already verified in production, twice:

| | Order 1 | Order 2 |
|---|---|---|
| Stripe | `pi_3UCOT8…` succeeded | `pi_3UCOaQ…` succeeded, $47.00 (express) |
| Prodigi | `ord_1170523`, asset **downloaded**, item `Ok` | `ord_1170525`, `GLOBAL-TEE-BC-6004` white/M, Express, GB address |

A finished order page you can open right now: [order/pi_3UCOaQ…](https://benchmark-20260905-beauty-high-clau-gold.vercel.app/order/pi_3UCOaQLWgjfAb5jE1kCacmsU?payment_intent=pi_3UCOaQLWgjfAb5jE1kCacmsU&payment_intent_client_secret=pi_3UCOaQLWgjfAb5jE1kCacmsU_secret_u0GER3g2Hxu0hCmK78ubBy6Kk&redirect_status=succeeded)

Append `&fmt=svg` to any artwork URL to see the vector behind the raster.

## Architecture notes

- **No database.** The order spec lives in PaymentIntent metadata; address and email live on the intent. Everything is recoverable from Stripe.
- **Fulfilment** is webhook-driven (`payment_intent.succeeded` → Prodigi), idempotent twice over (metadata lock + Prodigi idempotency key), with the order page as a retry safety net. A 500 from the webhook asks Stripe to retry.
- **Print files** are glyph outlines via `opentype.js` → `sharp`. No fonts at the printer, no rasterised text. URLs are HMAC-signed so the endpoint isn't a free text renderer, but stay unauthenticated so Prodigi can pull them.
- Prices are computed server-side; re-opening an intent requires the client secret, not just the id.

## Gaps you should know about

1. **Stripe sandbox expires 2026-09-12.** I provisioned it via the CLI. Claim it at the `sandbox_claim_url` in your Stripe config TOML or the store stops taking payments in a week.
2. **Everything is test mode.** Going live means live Stripe keys, a live Prodigi key (the `test_` prefix is what routes to sandbox — `src/lib/prodigi.ts` switches automatically), and a new webhook endpoint.
3. **Print placement on A4-ratio printers.** The canvas matches Prodigi's 4680×5790 global print area and uses `fitPrintArea`. Prodigi's EU variants have a 2480×3507 (A4) area, so those fit by width and the design sits a little lower on the chest. Worth pinning down with a real sample before launch.
4. **No physical proof yet.** Sandbox orders never actually print. Colour fidelity, ink density on the four garment colours, and the 8-inch-wide 13-digit epoch line at real DTG resolution are all unproven on cloth.
5. **Pricing is a guess.** $32 + $15 express is a plausible margin over Prodigi's tee cost, but I never called their quotes API. Run `POST /v4.0/quotes` per destination before you trust it — international express in particular.
6. **Express Checkout (Apple/Google Pay)** is wired up and hides itself when no wallet is available, so it has never rendered in my testing. Needs a real device pass.
7. **No order-status polling.** The order page shows the Prodigi id but never fetches shipping status or tracking. Prodigi has status webhooks; hooking those up plus a lookup page is the obvious next build.
8. **No emails beyond the Stripe receipt.** No "your shirt shipped" mail.
9. **Shipping countries are a hand-curated list** of ~55 in `src/lib/catalog.ts`, not derived live from the SKU's `shipsTo`.

## What I'd do next

Claim the sandbox, run a Prodigi quote for two or three destinations to sanity-check pricing, then order one real sample per colourway to confirm the print sits where the preview says it does.
