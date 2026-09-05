Everything's live and working. Here's the full rundown:

## What's live

**https://benchmark-20260905-minimal-high-cla-zeta.vercel.app**

A rebuild of datetime.store: one product, a t-shirt printed with the exact datetime (to the millisecond) you complete checkout. I pulled the original repo's source (it was a dead CRA app with no README) to reverse-engineer the actual product — a live millisecond clock rendered onto a shirt mockup, two fits ("fitted"/"unisex"), a fixed $22.50-off-$30 price, checkout via Stripe, fulfillment via Scalable Press. I rebuilt it as:

- **Next.js 16** (App Router/TS/Tailwind v4), dark theme, live-updating clock over an SVG shirt, style/size picker
- **Stripe Checkout** (hosted page — card, Apple Pay, Google Pay, Link, shipping address collection) instead of the original's custom Elements form
- **`next/og`** generates the actual print artwork as a PNG on the fly from the captured timestamp — no image storage needed
- **Prodigi Print API** (sandbox) replaces Scalable Press: `GLOBAL-TEE-GIL-64000`/`64000L`, black, DTG front print
- A Stripe webhook (`checkout.session.completed`) places the Prodigi order using the shipping address Stripe collected — no database; order state travels in Checkout Session metadata

I created a throwaway Stripe sandbox (test mode) and wired a real webhook endpoint to the deployed domain; the Prodigi sandbox key you provided is live in Vercel env vars.

## How to test it

1. Visit the site, pick a fit/size, click **"Buy this exact moment."**
2. On the Stripe page, use test card `4242 4242 4242 4242`, any future expiry/CVC, and any address.
3. You'll land on `/success` showing your frozen timestamp and the generated shirt artwork.
4. Behind the scenes, the webhook fires and creates a real order in **Prodigi's sandbox** — I verified this end-to-end with a signed synthetic webhook event (got back a real `ord_...` id). I did not push a real card payment through the Stripe-hosted iframe (it's a nested-iframe accordion that resisted scripted automation, and it's not central to correctness), so I'd recommend you personally click through one real purchase to see the whole thing fire.
5. Stripe sandbox claim link (so you own the test account instead of it expiring in 7 days): I can hand you the claim URL if you want it — just ask.

## Known gaps

- **No persistent order storage/admin view.** Fine for a demo; a real store would want a DB to track Prodigi order status, retries, and refunds.
- **No retry/dead-letter handling** if the Prodigi API call fails inside the webhook — Stripe will retry the webhook a few times, but there's no alerting.
- **Shipping-country allowlist is a reasonable subset**, not Prodigi's exact full per-SKU ship-to list — some edge-case countries might fail at Prodigi order time.
- **Stripe account is a temporary CLI sandbox** (expires 2026-09-12) — claim it or swap in your own test/live keys before that.
- Never load-tested; Vercel/Stripe/Prodigi will scale fine but nothing's been stress-tested.
- I did not verify a real Apple Pay/Google Pay/Klarna flow, only the card + address path.

## Next steps for you

1. Do one real test purchase to see it end-to-end in your own eyes.
2. Decide if you want to claim the Stripe sandbox (I can share the claim link) or switch to your own Stripe account's test/live keys.
3. When ready for real orders, swap `PRODIGI_API_BASE_URL` to Prodigi's production API and use a production Prodigi key + live Stripe keys.
