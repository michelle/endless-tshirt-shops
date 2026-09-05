The rebuild is live and verified end to end.

**Live store:** https://benchmark-20260905-beauty-high-clau.vercel.app (Vercel project `benchmark-20260905-beauty-high-claude-claude-fable-5-1`; Vercel truncates the name for the domain).

## What I built

- **Next.js 15.5 app**, no database. Stripe is the order ledger, Prodigi is the fulfilment ledger, and the Checkout Session id links them.
- **The shirt** is an SVG tee ticking the live Unix millisecond timestamp every animation frame, with a pointer-tracked 3D tilt and a float. "Freeze this moment" stops the clock with a camera flash, then embedded Stripe Checkout slides in beneath a ticket showing the frozen moment. "Let it go" releases it.
- **Whimsy:** the sky palette changes with the visitor's local hour (dawn, day, dusk, night), with a sun or moon, twinkling stars, a shooting star, and drifting clouds. A stats strip shows moments claimed, seconds since the epoch, a countdown to the next round timestamp, and "shirts that match yours: 0 guaranteed". FAQ, "How it works", and a thank-you page with the exact print proof.
- **Catalog:** Unisex (Bella + Canvas 3001) or Fitted (Bella + Canvas 6004), black with white ink or white with black ink, S to 2XL. Price $22.50, list $30.00, free shipping to 30 countries.
- **Fulfilment:** the Stripe webhook and the thank-you page both call one idempotent function that looks Prodigi up by merchant reference and sends an idempotency key, so a session can never produce two print orders. Prodigi fetches the print file from a public route that renders a transparent 2340x2895 PNG in about a quarter second.

## How to test

1. Open the store, pick a cut, colour, size, and press **Freeze this moment**.
2. In the embedded checkout, use any email, a real-looking address in a listed country, and card `4242 4242 4242 4242`, any future expiry, any CVC.
3. You land on `/thanks?session_id=…`, which shows the moment, the Prodigi order id, and the live print stage. It polls until the printer answers.
4. Sanity endpoints: `/api/health` (all four checks currently green) and `/api/orders/<session_id>`.

I already ran this flow with Playwright. It produced Stripe session `cs_test_a11hw…` and Prodigi sandbox order `ord_1170515` with the right SKU, attributes, address, and artwork URL. The webhook was delivered, and only one Prodigi order exists for the session.

## Gaps I know of

- **Stripe is a claimable sandbox that expires on 2026-09-12.** I created it with `stripe sandbox create` because the CLI had no keys. Its key is restricted, so it cannot read balance or send test receipts. Claim it from the URL in the Stripe CLI config, or swap in your own keys.
- **Prodigi is sandbox.** Nothing prints. The sandbox never downloads the artwork, so the "printReadyAssetsPrepared" step stays NotStarted. Live Prodigi will fetch the real file.
- **No email beyond Stripe's receipt.** There is no order-confirmation or shipping email. Prodigi callbacks hit `/api/prodigi/callback` and are only logged, since there is no database.
- **Timestamp trust.** The buyer's frozen millisecond is accepted if it's within ten minutes of the server clock and not in the future, otherwise the server time is used. A determined person can pick any millisecond in that window.
- **Print placement is an estimate.** Digits are placed about 8.5 in wide and 3 in below the collar using Prodigi's fill-print-area sizing. Order one real sample before going live.
- **Stats are approximate.** "Moments claimed" counts up to 100 paid sessions and shows a plus sign beyond that.

## What you need to do next

1. **Claim the Stripe sandbox** before 2026-09-12, or replace `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, and `STRIPE_WEBHOOK_SECRET` on Vercel and recreate the webhook endpoint for `/api/stripe/webhook`.
2. **Go live:** set `PRODIGI_API_BASE` to the production Prodigi URL with a live key, switch Stripe to live keys, and re-run one real order to check placement and size.
3. **Point a custom domain** at the project and update `NEXT_PUBLIC_SITE_URL`, since Prodigi and Stripe fetch artwork from that origin.
4. Optionally enable Stripe email receipts in the dashboard and decide whether you want a transactional email provider for shipping updates.

The source is committed locally in the workspace with a README describing the architecture and environment variables.
