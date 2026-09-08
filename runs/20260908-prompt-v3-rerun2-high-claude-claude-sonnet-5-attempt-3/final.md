Everything is deployed, tested end-to-end, and working. Here's the summary:

## What I built: **Skyprint**

A DTG t-shirt store with a genuinely personalized concept: customers pick **a date, time, and place that means something to them** (a first date, a wedding night, when their kid was born), and the store renders the **real moon phase** for that moment plus a deterministic, one-of-a-kind starfield into a dark "poster" panel, prints it on a shirt via DTG, and ships it. No two orders are alike, and nothing is pre-designed — every order generates its own art.

**Live store:** https://benchmark-20260908-prompt-v3-rerun2-six.vercel.app

## Architecture
- **Next.js 16** on Vercel, project `benchmark-20260908-prompt-v3-rerun2-high-claude-claude-sonnet-5-attempt-3`
- **Stripe** (Card Element, restricted sandbox key) for payment — the *only* trusted source of price (computed server-side, never from the client)
- **No database** — the Stripe PaymentIntent's metadata *is* the order record (design inputs, shipping address, fulfillment status). The design itself is never stored as a file; it's regenerated on demand from those inputs, both for the live browser preview and for the actual print file, so they're always pixel-identical.
- **Prodigi** order is only created from a **server-to-server Stripe webhook** (`payment_intent.succeeded`), never from the client — confirmed a declined card never reaches Prodigi, and a confirmed one does, with a real sandbox order (`ord_...`) whose artwork Prodigi successfully downloaded.
- Webhook has an idempotency guard (re-fetches the PaymentIntent fresh, not the frozen event payload) — verified by manually replaying the same Stripe event and confirming no duplicate Prodigi order was created.

## How to test it
1. Go to `/design`, search a city, pick a date/time, optional caption, shirt style/color/size, fill shipping.
2. Card: **4242 4242 4242 4242**, any future expiry, any CVC (Stripe test mode).
3. You'll land on `/order/<id>` which polls live status: Payment confirmed → Sending to print partner → In production at Prodigi.
4. Everything is running against **sandboxes** — no real charge, no real shirt gets printed/shipped.

## Known gaps
- **Stripe sandbox expires 2026-09-15.** It's a claimable sandbox (couldn't provision a full account headlessly). Claim it here before then or the store's payments go down: https://dashboard.stripe.com/onboard_sandbox/YWNjdF8xVURJeW00cDAzemdNMXIzLDE3ODk1MDEwOTUv100jWLNPA4t
- Restricted sandbox key can't reach `/v1/payment_method_configurations`, so I used the classic Card Element (single card field) rather than Payment Element — deliberate, avoids showing payment methods the key can't actually take.
- Shipping is a flat $6.95 rather than a live Prodigi quote; no sales tax (add Stripe Tax for production).
- Print file renders at 1600×2000 (satori/@vercel/og); Prodigi's actual print area is ~4665×5844 — fine for this demo, worth re-rendering at full resolution for real production print quality.
- Single item per order, USD only, 9 shipping countries in the dropdown (Prodigi supports more).
- No admin/refund/order-history UI, no email receipts beyond Stripe's default.
- Webhook retry could in rare cases double-submit to Prodigi if the *first* attempt fails after Prodigi already created the order but before we recorded it — documented in the code, mitigated but not eliminated.

## Before real production
1. Claim the Stripe sandbox (or swap in a real Stripe account) and rotate `STRIPE_SECRET_KEY` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` / `STRIPE_WEBHOOK_SECRET` in Vercel.
2. Swap `PRODIGI_API_KEY` / `PRODIGI_API_BASE` to Prodigi's live endpoint and a live key.
3. Add Stripe Tax, real Prodigi shipping quotes, and a custom domain (SSO/deployment-protection is already disabled on this project).
4. Bump the print file to full print resolution and consider a proper order-lookup DB if you outgrow Stripe-metadata-as-database.
