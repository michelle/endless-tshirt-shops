# Lunaria

Custom moon-phase t-shirts, printed on demand.

Every shirt shows the **real moon phase** for a date the customer chooses,
rendered as a one-of-a-kind design and printed with direct-to-garment (DTG)
technology. Because each shirt is unique to its date and words, DTG is the
perfect fit — there is no inventory, and every order is made to order.

## Stack

- **Next.js 14** (App Router) on Vercel
- **Stripe Checkout** for payments (hosted checkout, `checkout.session.completed` webhook)
- **Prodigi Print API** (sandbox) for on-demand printing and shipping
- **@napi-rs/canvas** for server-side design rendering (moon phase + stars + text)

## How it works

1. Customer customises a shirt (date, title, place, colour, size) on `/customize`.
2. `/api/checkout` creates a Stripe Checkout Session with the customisation in
   its metadata and a deterministic design URL.
3. The customer pays on Stripe's hosted checkout.
4. Stripe sends `checkout.session.completed` to `/api/webhooks/stripe`, which
   verifies the signature and — only after confirming `payment_status === "paid"` —
   creates a Prodigi order pointing at the design URL.
5. Prodigi downloads the design, prints the shirt, and ships it.

The design is rendered deterministically by `/api/design?d=<base64url(json)>`,
so the same URL always returns the same PNG — which is what lets us hand
Prodigi a stable, publicly-accessible asset at checkout time.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `STRIPE_SECRET_KEY` | Stripe secret key (sandbox) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `PRODIGI_API_KEY` | Prodigi sandbox API key |
| `PRODIGI_API_BASE_URL` | Optional; defaults to `https://api.sandbox.prodigi.com` |

## Local development

```sh
npm install
npm run dev
```

To test the webhook locally, forward Stripe events:

```sh
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

## Going to production

See the completion report for the full checklist. In short: switch Prodigi to
the live API, use live Stripe keys, add a real order database, and set up
customer-facing order tracking.
