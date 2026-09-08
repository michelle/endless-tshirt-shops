All environment variables are correctly configured. Everything is built, deployed, and fully verified end-to-end. Here's the rundown:

## What's live

**Seed & Ink** — https://benchmark-20260907-prompt-v3-high-c-chi.vercel.app

The concept: type any phrase (a name, a date, an inside joke) and it's hashed into a seed that drives one of four generative-art algorithms (Bloom, Flow Field, Circuit, Nebula) across 6 curated palettes. The exact same phrase always regrows the exact same design — nothing is pre-made, and it's specifically built to lean on DTG's one-off-print capability rather than screen printing. A small back-of-neck "serial number" mark (rendered in a hand-built dot-matrix font, no font dependencies) reinforces the one-of-one framing.

**Stack:** Next.js on Vercel · Stripe Checkout (sandbox) for payment · Prodigi Print API (sandbox) for DTG fulfillment, Gildan 64000 tee.

**How it works end to end:**
1. `/customize` — live canvas preview of the design on a shirt mockup, pick style/palette/color/size/qty.
2. Checkout creates a Stripe Checkout Session; the print-ready design lives at a deterministic URL (`/api/design-image?...`) rendered server-side with `@napi-rs/canvas` — same algorithm as the browser preview, so no image upload/storage step is needed.
3. **Only after Stripe confirms payment**, a webhook places the order with Prodigi (front + back print assets, shipping address from Checkout's collected shipping details). It's gated with an idempotency key = the Checkout Session ID, so retries or a slow webhook can never double-print — I verified this by calling Prodigi twice with the same key and confirming it returned `AlreadyExists` with the same order.

**I ran a full real test purchase** (via a real Chromium browser driving the actual hosted Stripe Checkout page, test card 4242...): payment succeeded → webhook fired → Prodigi sandbox order `ord_1171015` was created with the correct address/SKU/attributes → Prodigi successfully downloaded both print files from the live site (`downloadAssets: Complete`). That's the whole pipeline confirmed working, not just each piece in isolation.

## How you can test it
- Visit the site, go to "Design yours," pick a seed/style/palette/shirt, and checkout with card `4242 4242 4242 4242`, any future expiry/CVC/ZIP.
- The success page polls `/api/order-status`, which will show the Prodigi order reference once placed.
- You can watch orders land in the Prodigi sandbox dashboard, and payments in the Stripe sandbox (claim it at the URL from `stripe sandbox create` — it expires 2026-09-15 if unclaimed).

## Known gaps before real production
- **No database/order history** — by design, to avoid needing infra, but it means there's no admin view of past orders beyond Stripe's and Prodigi's own dashboards, and no order-confirmation email is sent (Prodigi/Stripe both support this, just not wired up).
- **Live keys needed** — currently sandboxed: a real Stripe account + a live Prodigi contract/API key.
- **Design/garment contrast** — some palette + shirt-color combos (e.g. light palette on a white shirt) could print with low contrast; worth either constraining combos or adding a contrast check.
- **Shipping** — flat $38 price and a conservative 12-country allowlist; real launch should pull actual Prodigi quotes per destination and decide on tax handling (Stripe Tax isn't enabled).
- **Dependency vulnerabilities** — Next.js is pinned to 14.2.35 (latest 14.x); several npm-audit findings only have fixes in Next 15.5.21+/16.x, which involves a breaking-change migration (async `params`/`searchParams`) I didn't want to do blind. None of the flagged issues touch code paths this app actually uses (no Server Actions, Middleware, `next/image`, or custom server), but it's worth scheduling that upgrade.
- **Bot/fraud protection** — Stripe Checkout's hosted page already includes hCaptcha-based bot defenses out of the box, which is good; nothing extra needed there.
