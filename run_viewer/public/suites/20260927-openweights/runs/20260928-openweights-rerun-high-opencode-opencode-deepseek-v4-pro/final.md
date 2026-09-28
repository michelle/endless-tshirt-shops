The build is complete and deployed. Here's the summary.

## What I built: **Lunaria** — custom moon-phase t-shirts

**Live at: https://benchmark-20260928-openweights-reru.vercel.app**

An original DTG-first concept: every shirt shows the **real, astronomically-computed moon phase** for a date the customer chooses, with their own title and place. Because each shirt is unique to its date and words, there's no inventory — every order is printed to order, which is exactly what DTG is for.

**Stack:** Next.js 14 (App Router + TypeScript + Tailwind) on Vercel · **Stripe Checkout** for payments · **Prodigi Print API** (sandbox) for printing/shipping · `@napi-rs/canvas` for server-side design rendering.

**The flow:** customize → Stripe Checkout → `checkout.session.completed` webhook (signature-verified, and only after `payment_status === "paid"`) → Prodigi order → Prodigi downloads the deterministic design PNG and ships.

## How to test it

1. Open the URL above → **"Design your shirt"**.
2. Pick a date (try a few — the moon phase changes), add a title/place, choose colour + size.
3. **Checkout** with test card **`4242 4242 4242 4242`**, any future expiry/CVC, any address.
4. You'll hit the success page; the order then appears in the Prodigi sandbox with the design asset downloaded (`status: Ok`).

I verified the full chain during the build: checkout creation, webhook signature verification (valid *and* invalid), the "only fulfil after payment" guard (an `unpaid` session is correctly skipped), Prodigi order creation, and Prodigi successfully downloading the generated asset.

## Known gaps

- **No order database** — orders live only in Stripe/Prodigi; the Prodigi order id isn't persisted back to the customer.
- **No customer-facing order tracking** — the success page is static; Prodigi's status callback only logs.
- **No branded confirmation email** (Stripe sends its receipt only).
- **Async payment methods** are only partially handled (card payments fully covered).
- **Sandbox only** — Prodigi sandbox + Stripe test mode; nothing actually ships or charges.
- **No tax / dynamic shipping** — flat $38 with shipping absorbed.

## To go to production

1. Point Prodigi at `api.prodigi.com` with a live key (one-line env switch, already wired).
2. Swap in live Stripe keys + live webhook endpoint.
3. Add an order database (e.g. Vercel Postgres) and reconcile webhook retries against it.
4. Add order tracking, branded emails, Stripe Tax + real shipping rates, and legal pages (terms/privacy/refunds).

One note: the Stripe sandbox account I provisioned is a claimable sandbox that expires in ~7 days — it's test-only and not part of any production path.
