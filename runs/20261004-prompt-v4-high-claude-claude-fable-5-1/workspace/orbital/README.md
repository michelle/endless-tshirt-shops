# Orbital — the solar system on your day, on a tee

A print-on-demand t-shirt store. The customer picks a date (birthday, wedding, the day they met…),
a caption, a shirt colour and an ink palette. We compute the true heliocentric positions of the
planets for that day and render a minimal diagram that is printed direct-to-garment by Prodigi.
Every date yields a different shirt, which is exactly what DTG is good at: one-off, full-colour,
fine-line artwork with no setup cost.

## How it works

```
Browser ──design (SVG preview, same code as print)──▶ Next.js
   │                                                   │
   │  POST /api/checkout ──▶ Stripe Checkout (hosted) ◀─┘ design params live in session metadata
   │                                │
   │   pays with card               ▼
   │                     checkout.session.completed ──▶ POST /api/webhooks/stripe
   │                                                      │ verifies signature, payment_status == paid
   ▼                                                      ▼
/order/{session}  ◀── also calls ensureProdigiOrder ──▶ Prodigi POST /v4.0/orders
 (status page)         (idempotent: merchantReference      asset = /api/art?d=…&sig=…
                        + idempotencyKey = session id)     (4665×5844 px transparent PNG, 300 dpi)
```

* **Artwork** – `src/lib/astro.ts` (JPL Keplerian elements, 1800–2050) and `src/lib/design.ts`
  (pure SVG builder shared by browser preview and server render). `src/lib/render.ts` rasterises
  with resvg at Prodigi's exact front print-area size for the Gildan 64000.
* **Payments** – Stripe Checkout collects shipping address + phone; two flat shipping rates map to
  Prodigi Standard/Express. Nothing is sent to the printer until Stripe says `paid`.
* **Fulfilment** – `src/lib/fulfil.ts` builds the Prodigi order. The webhook does it first; the
  order page re-calls it as a safety net (missed webhook) — both paths are idempotent.
* **Art URL security** – `/api/art` only renders designs carrying an HMAC (`ART_SIGNING_SECRET`),
  so the print endpoint cannot be used as a free rendering service.
* **Admin** – `/admin?key=ADMIN_KEY` lists recent Prodigi orders.

## Run locally

```bash
cp .env.example .env.local   # fill in keys
npm install
npm run dev
# in another terminal, forward webhooks:
stripe listen --forward-to localhost:3000/api/webhooks/stripe   # put the printed whsec_ in .env.local
```

## Deploy

`scripts/deploy-temporary.sh` builds locally and deploys with `vercel deploy --temporary` (no Vercel
login needed; claim the deployment from the printed claim URL within 60 minutes to keep it). Once the
project is claimed, deploy normally with `vercel --prod` and set the env vars in the Vercel dashboard.

The Linux resvg binaries are listed as optionalDependencies so the local build can bundle them for
Vercel's Linux functions.

## Going to production checklist

1. Claim the Stripe sandbox (link in the handover notes) → create a live account → swap
   `STRIPE_SECRET_KEY` for a live key and create a live webhook endpoint (`STRIPE_WEBHOOK_SECRET`).
2. Swap `PRODIGI_API_KEY` for a live key and set `PRODIGI_API_BASE=https://api.prodigi.com`.
   Order one shirt to yourself first and check the print.
3. Set `SITE_URL` to your final domain (artwork URLs sent to Prodigi must stay reachable for days).
4. Enable Stripe Tax (or price tax-inclusive) and confirm the shipping rate table against Prodigi quotes.
5. Add transactional email (Stripe's receipt email covers payment; add a "shipped" email using
   Prodigi's order webhooks/callbacks).
6. Persist orders (e.g. Postgres/KV) if you want an order list independent of Stripe + Prodigi.
