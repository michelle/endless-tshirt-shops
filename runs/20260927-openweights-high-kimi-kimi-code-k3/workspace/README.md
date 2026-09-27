# StarMark — Wear Your Moment

A fully customized print-on-demand t-shirt store. Each shirt is printed (DTG,
via Prodigi) with a one-of-a-kind star map generated from the customer's exact
moment: date, time, place, and a personal caption. The sky rotation is
computed from real local sidereal time; the moon phase of that night is drawn
next to the coordinates.

## Stack

- **Next.js 14** (App Router) on Vercel
- **Star map engine** (`lib/starmap.ts`): procedural star catalog + sidereal
  projection → SVG (all text converted to glyph paths via opentype.js, so no
  font dependencies at render time) → 300 DPI PNG via `sharp`
- **Payments**: Stripe Checkout when `STRIPE_SECRET_KEY` is set; otherwise a
  clearly-labeled demo gateway (test card `4242 4242 4242 4242`) so the store
  is testable end-to-end in sandbox
- **Fulfillment**: Prodigi Print API v4 — orders are created **only after
  payment is confirmed** (Stripe webhook `checkout.session.completed` with
  `payment_status === "paid"`, or an approved demo charge)

## Flow

1. Customer customizes on `/` (live preview via `/api/preview`)
2. `/api/checkout` signs the design into an HMAC token and starts a payment
   session (Stripe Checkout or `/demo-checkout`)
3. On confirmed payment, `/api/stripe/webhook` (or `/api/demo-pay`) calls
   `fulfillPaidOrder()` → Prodigi order with the print-ready art URL
   `/api/art/<token>.png` (4680×5790 px = 15.6"×19.3" @ 300 DPI)
4. `/success` polls `/api/order-status` (matched by `merchantReference`)

## Environment variables

| Var | Required | Purpose |
|---|---|---|
| `PRODIGI_API_KEY` | yes | Prodigi API key (sandbox or live) |
| `PRODIGI_BASE_URL` | no | Defaults to `https://api.sandbox.prodigi.com`; set `https://api.prodigi.com` for production |
| `APP_SECRET` | yes | HMAC key that signs design tokens |
| `STRIPE_SECRET_KEY` | production | Enables Stripe Checkout (disables demo gateway) |
| `STRIPE_WEBHOOK_SECRET` | production | Verifies Stripe webhook signatures |
| `BASE_URL` | no | Override origin used in art/callback URLs |

## Product

- Bella+Canvas 3001 (`GLOBAL-TEE-BC-3001`), sizes XS–4XL, 5 colors
- Retail $38.90 with free standard shipping (Prodigi cost ≈ $16.57 to US)

## Develop

```bash
npm install
PRODIGI_API_KEY=... APP_SECRET=dev npm run dev
```

## Deploy

```bash
vercel deploy --prod
```
