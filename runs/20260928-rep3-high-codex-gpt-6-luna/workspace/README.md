# Little Night Garden

A personalized DTG shirt store built with Next.js, Stripe Checkout, and the Prodigi Print API. The artwork is composed from each buyer's chosen name, place, date, and bloom, then rendered as a transparent 3307 × 4606 PNG for the shirt's front print area.

## Vercel settings

Set these environment variables in the Vercel project, then redeploy:

- `STRIPE_SECRET_KEY` — Stripe test key while testing (`sk_test_…`); use `sk_live_…` for production.
- `STRIPE_WEBHOOK_SECRET` — signing secret for the webhook endpoint.
- `PRODIGI_API_KEY` — Prodigi sandbox key while testing; use the live key for production.
- `PRODIGI_API_BASE` — optional; defaults to `https://api.sandbox.prodigi.com`. Set to `https://api.prodigi.com` only when switching to the live Prodigi key.
- `ARTWORK_TOKEN_SECRET` — a private random secret used to encrypt customer details in print-art URLs.
- `NEXT_PUBLIC_SITE_URL` — `https://benchmark-20260928-rep3-high-codex-two.vercel.app` (used by the paid-order webhook to give Prodigi a public artwork URL).

Add a Stripe webhook pointing to `https://benchmark-20260928-rep3-high-codex-two.vercel.app/api/webhook`. Subscribe to `checkout.session.completed`. Stripe Checkout collects shipping details and payment. The handler verifies Stripe's signature and `payment_status === 'paid'` before creating a Prodigi order. Prodigi's `idempotencyKey` uses the Stripe Checkout Session ID so Stripe webhook retries don't create duplicate orders.

The store charges $42 plus $5.95 tracked shipping in USD. The fulfillment adapter defaults to Prodigi's sandbox endpoint and the Stanley/Stella Creator 2.0 (`TEE-SS-STTU755`) with the exact color and size attributes returned by the Prodigi product lookup.

## Test flow

1. Set a Stripe test secret and webhook signing secret in Vercel. Set `NEXT_PUBLIC_SITE_URL` to the deployed site and keep `PRODIGI_API_KEY` on the sandbox key. The production project already has a private `ARTWORK_TOKEN_SECRET`; use a separate random value for local development or staging.
2. Configure the Stripe endpoint above. For local development, forward events with `stripe listen --forward-to localhost:3000/api/webhook` and use the CLI's printed `whsec_…` value locally.
3. Make a test design, choose a size and color, and pay with Stripe's test card `4242 4242 4242 4242`, any future expiry, and any CVC.
4. Check Stripe's event delivery and the Prodigi sandbox dashboard for the order. The `/api/health` endpoint reports whether the server has configuration without exposing keys.

Sandbox Prodigi orders are not printed or shipped. The payment checkout remains unavailable until Stripe credentials and webhook signing secret are configured.


## Before launch

Configure live Stripe keys and a live `checkout.session.completed` webhook, change `PRODIGI_API_BASE` to `https://api.prodigi.com`, and use a Prodigi live key. Confirm your selling price covers the actual live product and destination shipping cost, set up tax collection, and publish customer service, privacy, and return policies. Checkout currently charges a flat USD 5.95 shipping amount and does not calculate tax. Shipment status and tracking email updates are not integrated.
