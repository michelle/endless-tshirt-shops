# Pawtraits — Custom Pet Portrait Tees

A fully functioning t-shirt store built around a single, DTG-native idea: every
customer uploads a photo of their pet and gets a one-of-a-kind illustrated
portrait printed on a premium tee. Because each shirt is a unique, full-color
one-off, direct-to-garment printing is the only sensible way to make it.

## How it works

1. **Customize** — the customer uploads a pet photo, picks an illustration
   style (watercolor, minimalist line, pop art, vintage sketch), a shirt color,
   a size, and an optional pet name. A live preview shows the result.
2. **Pay** — checkout is handled by **Stripe Checkout**. The uploaded photo is
   stored in **Vercel Blob** (public) and its URL plus the customization are
   carried through the Checkout session's metadata.
3. **Fulfill** — a Stripe webhook fires on `checkout.session.completed`. Only
   after payment succeeds does the app submit the order to the **Prodigi Print
   API** (sandbox), which prints and ships the tee via DTG.

## Stack

- **Next.js 14** (App Router) on Vercel
- **Stripe** for payments (Checkout + webhooks)
- **Prodigi Print API** (sandbox) for DTG fulfillment
- **Vercel Blob** for storing the uploaded portrait

## Environment variables

| Variable | Purpose |
| --- | --- |
| `STRIPE_SECRET_KEY` | Server-side Stripe key (Checkout + webhook verification) |
| `STRIPE_WEBHOOK_SECRET` | Verifies incoming Stripe webhook signatures |
| `PRODIGI_API_KEY` | Prodigi sandbox API key |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob read/write token (fallback; OIDC is used on Vercel) |

## Local development

```sh
npm install
vercel env pull   # pull BLOB_READ_WRITE_TOKEN etc. for local Blob access
npm run dev
```

## API routes

- `POST /api/upload` — accepts a pet photo (multipart or raw body), stores it in
  Vercel Blob, returns a public URL.
- `POST /api/checkout` — creates a Stripe Checkout session for the customized tee.
- `POST /api/webhook` — Stripe webhook; on `checkout.session.completed` it
  verifies the signature and submits the order to Prodigi.

## Product mapping

The tee is Prodigi SKU `GLOBAL-TEE-GIL-5000` (Gildan 5000 unisex heavy cotton).
Color and size are passed as item `attributes`; the portrait is the `front`
print-area asset with `fillPrintArea` sizing.
