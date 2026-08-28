## What I built

A faithful, modernized rebuild of **datetime.store** — reverse-engineered from the live site's compiled JS (the original repo's README was just Create React App boilerplate with no product docs). The core concept: it sells exactly one product — a t-shirt printed with the **exact millisecond Unix timestamp** at the moment you buy it. The homepage shows that number ticking live; the instant you click "Buy," it freezes forever.

**Stack:** Next.js 16 (App Router/TypeScript/Tailwind) · **Stripe Checkout** (test mode, hosted) for payment · **Prodigi Print API** (sandbox) replacing the original's Scalable Press for fulfillment · no database — Stripe's `PaymentIntent` metadata is the system of record for fulfillment status.

**Live URL:** https://benchmark-20260827-harness6-high-cl.vercel.app
(Vercel project: `benchmark-20260827-harness6-high-claude-sonnet`, newly created for this run)

## How to run and verify it

Local dev: `npm install && cp .env.example .env.local` (fill in keys) `&& npm run dev`. Full instructions in the repo's `README.md`.

**To verify the deployed app**, I ran the complete flow live via Playwright against production (not just locally): landing page → style/size pick → Stripe Checkout (real hosted UI, test card `4242 4242 4242 4242`) → payment → redirect to `/success` → Stripe webhook fires → real Prodigi **sandbox** order created and shown on the confirmation screen (e.g. `ord_1169317`), verified independently against Prodigi's API. Do the same yourself: visit the URL, buy a shirt with that test card and any US address, and watch the "Fulfillment status" panel go from "Queuing…" to "✓ Sent to print."

## Steps to get this ready for real customers

1. **Switch Stripe to live mode** — swap `STRIPE_SECRET_KEY` for a live key and register a live-mode webhook (details in README).
2. **Claim or replace the Stripe sandbox.** I had no browser to log into Stripe, so I used `stripe sandbox create` to provision test keys via proof-of-work. That sandbox is **unclaimed and expires 2026-09-04** — claim it at `https://dashboard.stripe.com/onboard_sandbox/YWNjdF8xVTh5MGxLQzdGaHZmb3pELDE3ODg0ODk2ODAv100keQOl36B` or swap in your own account's keys before then.
3. **Get a production Prodigi account/key** and point `PRODIGI_API_BASE_URL` at `https://api.prodigi.com/v4.0`.
4. **Wire up real order-confirmation emails** — currently only implied by copy text, not sent.
5. **Increase artwork resolution** for print quality (currently 1600×2000; Prodigi's print area wants ~4665×5844) and add basic rate-limiting to the public checkout endpoint.

Full checklist (8 items) is in the README.

## Known limitations

- No database — fine at this scale, won't scale to order search/admin tooling.
- No real emails sent yet.
- Demo-resolution artwork, not print-resolution.
- No automated test suite (verified manually, end-to-end, against the live deployment instead).

## Key decisions

- **Stripe Checkout (hosted)** instead of rebuilding the original's custom card form — less code, PCI stays with Stripe, free Apple/Google Pay + address collection.
- **Stripe metadata as the only datastore**, avoiding a database for a single-SKU store with a live-status requirement.
- **`next/og`-generated artwork** server-side (keyed by timestamp+style) instead of the original's client-canvas upload — tamper-proof and independently fetchable by Prodigi.
- Preserved the original's actual joke: the shirt prints the **raw millisecond epoch**, not a formatted date.
- Prodigi SKUs (`GLOBAL-TEE-GIL-64000` / `…L`, black) confirmed against the live sandbox catalogue, not guessed.

## Friction

- The reference repo had zero real documentation — I had to reverse-engineer the entire product spec (raw ms timestamp, live ticking, $22.50, free US shipping, Fitted/Unisex + S/M/L/XL, Stripe card + Apple/Google Pay) from the live site's minified JS/CSS bundles.
- No interactive browser for Stripe login → used `stripe sandbox create`'s no-login proof-of-work flow (documented above as a limitation).
- **Caught and fixed a real bug during verification**: Stripe's at-least-once webhook delivery caused a duplicate delivery to place two Prodigi orders for one paid session. Fixed with a PaymentIntent-metadata pre-check plus Prodigi's own `idempotencyKey` (verified directly against the sandbox API that a repeated request now returns `outcome: "AlreadyExists"` with the same order id) before final deploy.
- Stripe's current hosted Checkout renders card fields as plain inputs in the main document (not an iframe) only after the "Card" accordion row is expanded — took some trial and error to automate.
