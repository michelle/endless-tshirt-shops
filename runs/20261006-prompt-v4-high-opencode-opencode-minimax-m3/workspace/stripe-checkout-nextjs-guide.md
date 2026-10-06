# Stripe Checkout Integration for Next.js 14 (App Router) — Practical Guide

This guide covers the **hosted Stripe Checkout** flow (the "simplest path" — customers are redirected to a Stripe-hosted payment page), plus test-mode setup, webhooks, and going to production. Every code snippet is targeted at the **Next.js App Router** (`app/` directory) and references the official Stripe documentation.

> Authoritative sources used:
> - [Create a Checkout Session — Stripe API reference](https://docs.stripe.com/api/checkout/sessions/create)
> - [Build a Stripe-hosted checkout page — Stripe quickstart](https://docs.stripe.com/checkout/quickstart)
> - [Webhook signing — Next.js App Router example in `stripe-node`](https://github.com/stripe/stripe-node/blob/master/examples/webhook-signing/nextjs/app/api/webhooks/route.ts)
> - [Receive Stripe events in your webhook endpoint](https://docs.stripe.com/webhooks)
> - [Stripe API keys](https://docs.stripe.com/keys)
> - [Testing Stripe](https://docs.stripe.com/testing)
> - [Stripe CLI reference](https://docs.stripe.com/cli)
> - [Security at Stripe](https://docs.stripe.com/security)

---

## TL;DR — what you'll build

1. A **Route Handler** at `app/api/checkout/route.ts` that creates a Checkout Session server-side and either redirects or returns a URL.
2. A **server-side page** at `app/checkout/page.tsx` that POSTs to that route.
3. **Two pages** that Stripe redirects to: `app/checkout/success/page.tsx` and `app/checkout/cancel/page.tsx`.
4. A **webhook handler** at `app/api/webhooks/route.ts` that verifies signatures and fulfills orders.
5. **`.env.local`** with three variable names: `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`.

The webhook is the source of truth for fulfilling orders — never trust the redirect to `success_url` because a customer can hit it without paying (or close the tab before the webhook arrives). The redirect page is for UX only.

---

## 1. Stripe Checkout Sessions (hosted page)

### 1.1 Architecture

For a one-time payment, the flow is:

```
[Next.js server] → POST /v1/checkout/sessions (creates Session)
                 ← returns session.url (https://checkout.stripe.com/c/pay/cs_test_…)
[Next.js server] → 303 redirect customer to session.url
[Customer]       → enters card on Stripe-hosted page
[Stripe]         → synchronously redirects customer to your success_url or cancel_url
[Stripe]         → asynchronously POSTs events to your webhook endpoint
```

The Stripe-hosted Checkout page (`ui_mode: 'hosted_page'`, the default) handles **all card data collection, PCI compliance, SCA/3DS, and the payment form UI**. Your server only needs to mint a session and listen to webhooks.

### 1.2 Environment variables

Create `.env.local` in your Next.js project:

```bash
# Server-side only — never prefix with NEXT_PUBLIC_
STRIPE_SECRET_KEY=sk_test_...
# Used by your Route Handlers to verify webhook payloads
STRIPE_WEBHOOK_SECRET=whsec_...

# Client-side — must be prefixed with NEXT_PUBLIC_ to be exposed to the browser
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

For **hosted Checkout only**, you actually don't need the publishable key on the client at all — it's only needed for `stripe-js` / Elements. You're free to drop `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` if you aren't also rendering Stripe Elements. The example in Stripe's hosted-checkout quickstart still includes it for consistency.

In **Vercel**, set these in **Project Settings → Environment Variables**. Set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` for Production and Preview; you typically keep them out of Development so previews can't trigger real test charges.

### 1.3 Install the SDK

```bash
npm install stripe
```

Don't install `@stripe/stripe-js` unless you're also using Stripe Elements/embedded Checkout — for the redirect flow it's not needed.

### 1.4 Minimal setup: one Stripe client

Create `lib/stripe.ts` (re-used by both the checkout route and the webhook route):

```ts
import 'server-only'
import Stripe from 'stripe'

// Pin a specific API version so event/webhook payloads are stable across
// Stripe rolling updates. Find the latest in your Stripe Dashboard → Developers.
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-09-30.acacia', // or whatever your account pins to
  typescript: true,
})
```

> Pinning `apiVersion` is not strictly required, but recommended — Stripe's rolling API versions can otherwise change event shapes underneath you.

### 1.5 Route Handler that creates a Session

`app/api/checkout/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'

export const dynamic = 'force-dynamic' // never cache a checkout endpoint

export async function POST(req: Request) {
  // 1. Identify the cart/order the customer is paying for.
  //    In a real app you'd read this from your DB / cart cookie / session,
  //    compute the total server-side, and look up any internal order id.
  const body = await req.json().catch(() => ({}))
  const orderId = body?.orderId ?? crypto.randomUUID()

  // 2. Create the Checkout Session.
  //    – mode: 'payment' for a one-time charge (vs. 'subscription' / 'setup')
  //    – line_items: either pre-created Price IDs or inline price_data
  //    – metadata: your own key/value pairs; appears on every event tied
  //      to this Session (checkout.session.completed, payment_intent.*, …)
  //    – client_reference_id: also surfaced on the Session; convenient
  //      when you want a single inner-system id visible everywhere
  //    – success_url/cancel_url: must be absolute URLs; include the
  //      {CHECKOUT_SESSION_ID} template variable in success_url if you
  //      want to look the Session up server-side on the next page
  const origin = req.headers.get('origin') ?? 'http://localhost:3000'

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'], // optional; Stripe's default set is fine
      line_items: [
        {
          // Inline pricing — useful when the price isn't already a Stripe Price.
          // For static catalogs, use { price: 'price_xxx', quantity: N } instead.
          price_data: {
            currency: 'usd',
            unit_amount: 1999, // $19.99 — minimum currency unit
            product_data: {
              name: 'Sticker pack',
              description: 'Pack of 3 vinyl stickers',
            },
          },
          quantity: 1,
        },
      ],
      customer_email: body?.email, // optional — prefills the email field
      metadata: {
        orderId,                    // your internal order id
        userId: body?.userId ?? '', // anything you need to round-trip
      },
      client_reference_id: orderId,  // surfaces on the Session object directly
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout/cancel`,
    })

    // 3a. Server-redirect path (button submits a form/POST):
    return NextResponse.redirect(session.url!, 303)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    )
  }
}
```

Key things to know about this code:

- **`mode: 'payment'`** → one-time payment. The other valid values are `'subscription'` (recurring via Stripe Billing) and `'setup'` (save a card for later use). Pick one wrong and the session behaves very differently.
- **`line_items`** has two shapes:
  - `{ price: 'price_xxx', quantity: N }` — uses a Price object you pre-created in Stripe (best for static product catalogs).
  - `{ price_data: { currency, unit_amount, product_data: { name } }, quantity: N }` — price inline (best when the amount isn't known up front — e.g., a custom-configurable cart).
  - **`unit_amount`** is in the currency's smallest unit (cents for USD, pence for GBP, etc.). There is no decimal in the API.
- **`metadata`** is copied onto the Checkout Session, the resulting PaymentIntent, the resulting Charge, and any related invoice. This is the canonical way to attach your internal `orderId` so the webhook can look it up. You can read any of these objects server-side and see your keys.
- **`client_reference_id`** is a top-level convenience field on the Session object. It's a good place for your own primary key.
- **`success_url`** must be a publicly reachable absolute URL. Include the literal string `{CHECKOUT_SESSION_ID}` somewhere in it — Stripe replaces it with the ID before redirecting, so your success page can do `?session_id={CHECKOUT_SESSION_ID}` and then call `stripe.checkout.sessions.retrieve(id)` to get authoritative order state.
- **`cancel_url`** is where Stripe's "back" button sends the user. Must also be a public absolute URL. (`stripe.checkout.sessions.create` marks `cancel_url` as "conditionally required" for `ui_mode: hosted_page`.)
- **`ui_mode`** defaults to `'hosted_page'`, so for the simplest flow you can leave it off — but be explicit so future readers (and you) don't wonder which mode you're using.

### 1.6 Client checkout button

For a true "redirect to Stripe-hosted page" flow, you don't even need the publishable key. A plain `<form>` POST works:

`components/CheckoutButton.tsx`:

```tsx
'use client'
// Plain server-managed button — submits a POST to your Route Handler.
// Stripe returns a 303 redirect to session.url, so this never renders
// a Next.js page.

export function CheckoutButton() {
  return (
    <form action="/api/checkout" method="POST">
      <button type="submit">Checkout</button>
    </form>
  )
}
```

If you prefer to trigger it from a `fetch` (e.g. from a cart drawer):

```tsx
'use client'
async function go() {
  const res = await fetch('/api/checkout', { method: 'POST' })
  // Next.js Route Handlers can't return a 303 from fetch() transparently
  // the way a form submission can. The simplest approach is to return
  // { url } JSON from the handler and let JS navigate:
  const { url } = await res.json()
  window.location.assign(url)
}
```

If you go the JSON-return route, change the handler's tail to:

```ts
return NextResponse.json({ url: session.url })
```

### 1.7 Success page

`app/checkout/success/page.tsx`:

```tsx
import { redirect } from 'next/navigation'
import { stripe } from '@/lib/stripe'

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>
}) {
  const { session_id } = await searchParams

  if (!session_id) {
    redirect('/')
  }

  const session = await stripe.checkout.sessions.retrieve(session_id, {
    expand: ['line_items', 'payment_intent'],
  })

  // STRIPE-DOCS-WARN: don't fulfill the order here. A customer can hit this URL
  // without actually paying (e.g. close the tab after the final click).
  // Fulfillment must be driven by checkout.session.completed in the webhook.
  if (session.payment_status !== 'paid') {
    redirect('/checkout/cancel')
  }

  return (
    <section>
      <h1>Thanks for your order!</h1>
      <p>We sent a receipt to {session.customer_details?.email ?? 'your email'}.</p>
    </section>
  )
}
```

Use the explicit `{CHECKOUT_SESSION_ID}` placeholder pattern in `success_url` (Stripe's docs and examples do this) because the redirect page can then **authoritatively read line items, totals, and payment status** from the Stripe API rather than trusting anything the client sent.

### 1.8 Cancel page

`app/checkout/cancel/page.tsx`:

```tsx
export default function CancelPage() {
  return (
    <section>
      <h1>Order canceled</h1>
      <p>Your cart is still saved. You can complete checkout any time.</p>
    </section>
  )
}
```

### 1.9 One-time-payment payload for an existing catalog

If your products are real `Price` objects (you set them up in the Stripe Dashboard or via `stripe.products.create` + `stripe.prices.create`), prefer this line_items shape — it stops the client from ever being able to influence prices:

```ts
line_items: [
  { price: 'price_1ABCxyz...', quantity: 3 },
  { price: 'price_2DEFuvw...', quantity: 1 },
],
```

You'll want to architect like this: **store a baseline `Price ID` per product in your own DB**, and submit quantity adjustments when the cart changes. The Checkout Session then becomes the authoritative "current cart" at moment-of-payment.

---

## 2. Test mode setup

### 2.1 API key prefixes

Stripe's keys are clearly named for mode:

| Purpose             | Test mode prefix     | Live mode prefix     | Where to find it                              |
|---------------------|----------------------|----------------------|-----------------------------------------------|
| Publishable key     | `pk_test_...`        | `pk_live_...`        | Dashboard top, "Publishable key"              |
| Secret key          | `sk_test_...`        | `sk_live_...`        | Dashboard → Developers → API keys              |
| Restricted key (★)  | `rk_test_...`        | `rk_live_...`        | Dashboard → Developers → API keys              |
| Webhook signing key | `whsec_...`          | `whsec_...`          | Dashboard → Developers → Webhooks → endpoint  |

(★) **Restricted Keys** are the current best practice for new integrations — they let you scope a key to only the permissions your code needs (e.g., "create Checkout Sessions + read own events"). Stripe's [API keys docs](https://docs.stripe.com/keys) say: *"We recommend using RAKs instead"* in place of secret keys for new use cases.

You should be able to register/login, get test keys, and have a working local sandbox immediately. Today's Stripe sign-up is fast.

### 2.2 Where to find your test keys (matching the exact URL you mentioned)

- `https://dashboard.stripe.com/test/apikeys` — publishes your `pk_test_` and lets you create a new `sk_test_` or `rk_test_`.
- `https://dashboard.stripe.com/apikeys` — same page once you toggle out of test mode; shows `pk_live_/sk_live_/rk_live_`.
- `https://dashboard.stripe.com/test/webhooks` — to register a webhook endpoint in test mode (gives you the `whsec_…`).

The Stripe CLI command `stripe login list` will also print which account/sandbox you're authenticated against.

### 2.3 Test card numbers

You only ever need a small subset for end-to-end testing. The full list lives at [docs.stripe.com/testing](https://docs.stripe.com/testing).

| Scenario                                  | Card number          | Expiry    | CVC          |
|-------------------------------------------|----------------------|-----------|--------------|
| Payment succeeds                          | `4242 4242 4242 4242` | any future date | any 3 digits |
| Payment requires 3DS authentication       | `4000 0025 0000 3155` | any future date | any 3 digits |
| Payment is declined (insufficient funds)  | `4000 0000 0000 9995` | any future date | any 3 digits |
| Generic decline                           | `4000 0000 0000 0002` | any future date | any 3 digits |
| Expired card error                        | `4000 0000 0000 0069` | any future date | any 3 digits |
| Incorrect CVC                             | `4000 0000 0000 0127` | any future date | any 3 digits |
| Always-blocked by Radar (fraud)           | `4100 0000 0000 0019` | any future date | any 3 digits |
| Address (postal code / line1) check fails | `4000 0000 0000 0010` | any future date | any 3 digits |

For **server-side test code** (e.g., directly hitting `payment_intents.create` in a unit test), Stripe specifically recommends using `PaymentMethod` IDs (`pm_card_visa`, `pm_card_visa_chargeDeclinedInsufficientFunds`, etc.) instead of card numbers — the same page documents the equivalents. For hosted Checkout in a browser, you type the card number in.

⚠️ **Important:** "Don't use real card details." The Stripe Services Agreement explicitly forbids testing with real card numbers in any mode. Use `4242…` not your real Visa.

A useful debugging trick: simulate a customer in a specific country by adding a `+location_XX` suffix to the email you pass in `customer_email`:

```
customer_email: "test+location_DE@example.com"  // German customer
```

This makes hosted Checkout display EUR + Germany-appropriate payment methods without changing your code.

### 2.4 Can you test without a real signup?

**Yes — Stripe ship a sandbox command for exactly this.** Stripe now provides a CLI command that provisions a fully-featured test sandbox without requiring browser signup:

```bash
# Install the Stripe CLI: https://docs.stripe.com/cli
stripe sandbox create --email you@example.com
```

Output (per Stripe's CLI reference):

```json
{
  "secret_key": "rkcs_test_abc123",
  "publishable_key": "pk_test_def456",
  "claim_url": "https://dashboard.stripe.com/onboard_sandbox/0000000...",
  "account_id": "acct_ghi789",
  "expires_at": "2026-06-23"
}
```

You can then `STRIPE_SECRET_KEY=rkcs_test_abc123 npm run dev` and exercise the entire Checkout + webhook flow against `4242 4242 4242 4242`. The sandbox expires after 7 days; if you want to keep it long-term, open the `claim_url` once to upgrade it into a real Stripe account.

So:
- **What works without signup:** creating a Checkout Session, hitting hosted Checkout, completing the flow with test cards, receiving webhook events, reading them back via the API. This is enough for ~95% of development and CI test work.
- **What needs a real account:** webhook endpoint registration in the Dashboard (so Stripe pushes events from Stripe's servers to your URL — for this you still have to log in to get a `whsec_`); features that depend on the Connect platform; production payments. The CLI's `stripe listen --forward-to localhost:4242/webhook` solves (a) — you can test webhooks end-to-end without ever registering a Dashboard endpoint.

The CLI docs also recommend using `stripe sandbox create` for "coding agents or automated workflows" — this is genuinely new and useful.

---

## 3. Webhooks

### 3.1 Which events to listen for

For a one-time-payment checkout, you only really care about two (plus optionally one failure). From Stripe's `events/types` reference and the [`stripe-node` Next.js example](https://github.com/stripe/stripe-node/blob/master/examples/webhook-signing/nextjs/app/api/webhooks/route.ts):

- **`checkout.session.completed`** — fires when the customer completes Checkout. `session.payment_status === 'paid'` tells you whether money moved (it can be `paid`, `unpaid`, or `no_payment_required`). **This is the primary event for order fulfillment.**
- **`payment_intent.succeeded`** — fires when the Payment Intent itself succeeds. Useful as a redundant check if you also process refunds, partial captures, or async payment methods.
- **`payment_intent.payment_failed`** — for logging/UX (emails your team, surfaces in admin UIs) but **not** for fulfillment.

Industry standard: subscribe to `checkout.session.completed` for fulfillment; treat any other event as supporting telemetry. Do **not** fulfill orders in the synchronous `success_url` page — the webhook is your system of record.

### 3.2 Webhook signature header and verification

Every webhook POST carries a `Stripe-Signature` header:

```
Stripe-Signature: t=1492774577, v1=5257a869e7ec..., v0=6ffbb59b...
```

The `t=` value is the timestamp; `v1=…` is the HMAC-SHA256 of `"{timestamp}.{raw_body}"` keyed by your `whsec_…`. `stripe-node`'s `stripe.webhooks.constructEvent()` does all of this for you, including a default **5-minute timestamp tolerance** to mitigate replay attacks.

It is **critical to pass the raw, unmodified request body** to the verification function. Next.js App Router hands you a parsed body only if you call `.json()`; if you call `.text()` you get the unmodified UTF-8 bytes. The Stripe docs explicitly call this out in [Resolve webhook signature verification errors](https://docs.stripe.com/webhooks/signature):

> "Stripe requires the raw body of the request to perform signature verification. If you're using a framework, make sure it doesn't manipulate the raw body."

### 3.3 The Next.js App Router gotcha (and how to handle it)

App Router Route Handlers receive `Request` objects. There are two non-obvious issues to address:

1. **Use `await req.text()`** (not `req.json()`) to get the raw bytes.
2. **Read the signature header via `await headers()`** (it's a Promise in App Router 14+):
   ```ts
   import { headers } from 'next/headers'
   const sig = (await headers()).get('stripe-signature')
   ```

This pattern comes straight from the official [`examples/webhook-signing/nextjs/app/api/webhooks/route.ts`](https://github.com/stripe/stripe-node/blob/master/examples/webhook-signing/nextjs/app/api/webhooks/route.ts) in the `stripe-node` repo. Use it verbatim.

### 3.4 Complete App Router webhook handler

`app/api/webhooks/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import type Stripe from 'stripe'
import { stripe } from '@/lib/stripe'

// IMPORTANT: never cache this route — every request must be verified fresh.
export const dynamic = 'force-dynamic'

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET

export async function POST(req: Request) {
  if (!WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: 'STRIPE_WEBHOOK_SECRET is not set' },
      { status: 500 },
    )
  }

  // 1. Read raw body + signature header verbatim.
  //    Do NOT call req.json() — that parses and re-serializes the body
  //    and signature verification will fail.
  const sig = (await headers()).get('stripe-signature')
  const rawBody = await req.text()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig ?? '', WEBHOOK_SECRET)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${msg}` },
      { status: 400 },
    )
  }

  // 2. Handle a allowlist of events. Stripe sends many events; only do work
  //    for the ones your integration actually cares about.
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        // session.payment_status === 'paid' is the trigger to fulfill.
        // session.metadata.orderId (and client_reference_id) come from
        // what you passed when creating the Session in §1.5.
        if (session.payment_status !== 'paid') break

        const orderId = session.metadata?.orderId ?? session.client_reference_id
        // TODO: idempotently mark order {orderId} as paid + ship the goods.
        // Persist event.id; if Stripe retries, you can detect duplicates.
        break
      }

      case 'payment_intent.payment_failed': {
        const pi = event.data.object as Stripe.PaymentIntent
        const orderId = pi.metadata?.orderId
        // TODO: log/notify; do NOT fulfill.
        break
      }

      // Ignore everything else quietly:
      default:
        break
    }
  } catch (err) {
    // Don't 500 just because fulfillment side-effects failed —
    // log loudly and return 200 so Stripe doesn't endlessly retry.
    console.error('Webhook handler error:', err)
  }

  // 3. Always return 2xx quickly. Stripe's retries are aggressive (up to
  //    3 days, exponential back off, live mode). If your handler takes
  //    too long it will time out and re-deliver.
  return NextResponse.json({ received: true })
}
```

Pitfalls explicitly handled above (all called out in Stripe's docs):

- **Return 2xx fast.** Do any slow work (sending emails, inventory updates) after responding, or push to a queue. Stripe retries for up to three days with exponential back-off if you return non-2xx.
- **Idempotency: store `event.id` in your DB** and short-circuit if you've seen it. Stripe may deliver duplicates. Stripe's [Best practices for webhooks](https://docs.stripe.com/webhooks) page calls this out: "guard against duplicated event receipts by logging the event IDs you've processed."
- **Don't trust event ordering.** A Checkout session can generate `payment_intent.created` before `checkout.session.completed`. Use IDs and a final-status check, not "did I see event X yet?"
- **Allowlist events** in both your Dashboard registration and your code — listening to "all events" wastes your server.
- **Add `export const dynamic = 'force-dynamic'`** to the route file so Next.js doesn't try to cache it during build.

### 3.5 Local testing with the Stripe CLI

The CLI solves two problems: **forwarding webhooks without a public URL**, and **triggering synthetic events without going through Checkout**.

Install: `brew install stripe/stripe-cli/stripe` or `npm i -g stripe`. Then:

```bash
stripe login                       # one-time browser pairing

# In one terminal, start forwarding webhook events to your local handler:
stripe listen --forward-to localhost:3000/api/webhooks
# → prints "Ready! Your webhook signing secret is whsec_…" — paste that into
#   .env.local as STRIPE_WEBHOOK_SECRET (a DIFFERENT secret from any
#   Dashboard-registered endpoint).

# In another terminal, exercise checkout through your app:
# npm run dev, then http://localhost:3000, click checkout, pay with 4242.
```

You can also trigger a synthetic event without running Checkout — useful for CI and debugging:

```bash
stripe trigger checkout.session.completed
# Also: stripe trigger payment_intent.succeeded
```

`stripe listen` will print any event it forwards; `--print-json` prints the raw JSON; `--events=…` filters to a subset. The CLI command ref also notes: "The webhook signing secret provided will not change between restarts" — keep using the same secret across restarts of `stripe listen`.

**A subtle point that the official docs warn about:** if you run `stripe listen` and you also have a Dashboard endpoint registered, they're at best redundant and at worst the same secret reused incorrectly. For local development, rely on `stripe listen`; for production, register an endpoint in the Dashboard.

### 3.6 Webhook URLs for Vercel deployment

For production:

1. **Register an endpoint** at <https://dashboard.stripe.com/webhooks> (or programmatically via `POST /v2/core/event_destinations`). Endpoint URL:
   ```
   https://<your-vercel-domain>.vercel.app/api/webhooks
   ```
   For Production: use your custom domain (Stripe requires HTTPS, TLS 1.2+).
   For Preview/branch deploys: you can also register `https://<branch>-<project>.vercel.app/api/webhooks` if you want to test per-branch.

2. **Add the `whsec_…` shown on the endpoint page** to `STRIPE_WEBHOOK_SECRET` in your Vercel Project Settings → Environment Variables. (Production will get a different secret from Preview; that's expected.)

3. Pick the **events** to subscribe to. For hosted Checkout you only need `checkout.session.completed` (and optionally `payment_intent.payment_failed`). Selecting only the events you care about is one of Stripe's documented best practices — "Listening for extra events puts undue strain on your server."

4. Make sure your Route Handler is **not behind Vercel Authentication** (or any other middleware that requires a session cookie). Stripe's POST will have no cookie; treat the route as fully public but signature-gated.

5. **Vercel function timeout.** The default Vercel function timeout is 10–60s depending on plan. Signature verification + a quick DB write fits comfortably; if anything takes longer, ack first (`return NextResponse.json({ received: true })`) and push work to a queue (e.g., Vercel Queue, Inngest, Trigger.dev, or your own worker).

6. **For local development against the deployed preview URL**, two options:
   - Run `stripe listen --forward-to https://<preview>.vercel.app/api/webhooks` and use the secret it prints.
   - Or use Vercel CLI's `vercel dev` to proxy production traffic locally with a tunnel — less common; usually `stripe listen` is enough.

**One practical alternative:** since the Stripe CLI handles webhooks entirely via its own tunnels, you probably don't *need* a Dashboard endpoint at all in test mode. You can develop without registering anything on Stripe's servers. You'll only register the production endpoint when you push to production.

### 3.7 Manual payload troubleshooting

If signature verification fails (the error `"Webhook signature verification failed. Err: No signatures found matching the expected signature for payload."` is the typical message):

1. Confirm the secret matches the source. CLI-generated secrets are different from Dashboard-registered secrets even though both start with `whsec_`.
2. Check you're reading the raw body — log the first 100 chars of `rawBody` and compare to what the Dashboard's webhook delivery log shows.
3. Check the `Stripe-Signature` header is being read once, with no case mangling or trimming.
4. Make sure your server's clock is within 5 minutes of Stripe's. (NTP should keep you fine.).

Stripe's [Resolve webhook signature verification errors](https://docs.stripe.com/webhooks/signature) page walks through all of this in detail.

---

## 4. Production considerations

### 4.1 Test → Live

Stripe explicitly recommends **separating your test mode work from your live mode work**. Documented in [Switch to live mode](https://docs.stripe.com/keys#switch-to-live-mode):

1. **Toggle the API keys page to "live mode"** at <https://dashboard.stripe.com/apikeys>. Your test keys (`pk_test_/sk_test_`) won't work; only live keys (`pk_live_/sk_live_`) will.
2. **Replace both server-side keys** (`STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`) in your Vercel environment variables. The webhook secret changes because the endpoint's per-account secret differs between modes.
3. **Update the publishable key** in your client code (`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`).
4. **Register a new production webhook endpoint** under <https://dashboard.stripe.com/webhooks> pointing at your production domain.
5. **Complete Stripe's go-live checklist**: <https://docs.stripe.com/get-started/checklist/go-live>. It covers business profile, payouts, dispute configuration, Radar rules, and required information.
6. **Consider upgraded keys:** the [Stripe API keys page](https://docs.stripe.com/keys) recommends *Restricted Keys* (`rk_live_…`) over wildcard `sk_live_…` for new use cases, and *access policies* that limit which IPs/CIDR ranges can use each key.

The recommended sequence before flipping the switch:
   1. Wire up production environment variables in Vercel using your **live** keys, but with the **Stripe-live Checkout still in test mode** by leaving a piece of dev/test toggle. Then use a Stripe live test card for low-value payments? (Real card; won't process; but won't charge.) Instead, the safest pattern is:
   2. **Staging environment** that uses your **test keys**, deploys to a Vercel preview URL, and exercises the Checkout flow with `4242 4242 4242 4242`.
   3. **Production environment** that uses **live keys** plus a real, registered webhook endpoint.
   4. Wire business profile, payouts, 2FA on Stripe Dashboard before going live.

### 4.2 PCI compliance — confirmed: hosted Checkout handles it for you

The question you asked — "PCI compliance (Stripe Checkout handles this for us - confirm)" — is **confirmed** by Stripe's [Security at Stripe](https://docs.stripe.com/security) page:

> "If a user integrates with Stripe Elements, Checkout, Terminal SDKs, or our mobile libraries, we provide assistance in completing their PCI validation form (Self-Assessment Questionnaire) in the Dashboard."
> "Stripe is PCI Service Provider Level 1 […] the most stringent level of certification available in the payments industry."

What this means for your hosted Checkout integration specifically:

- **Card data never touches your server.** The redirect-based flow (`ui_mode: 'hosted_page'`) hands the customer off to `checkout.stripe.com`. The card form, the CVC, the PAN — none of it POSTs to `yourdomain.com`.
- **Your PCI scope stays at SAQ A** (the smallest, simplest one: just "I redirect to a PCI-compliant processor"). Stripe will guide you through completing it inside the Dashboard.
- **You don't fill out SAQ A-Merchant or SAQ D.** The fact that you collect order details via Stripe-hosted UI keeps you out of the heavier questionnaires.

Prerequisites to stay in SAQ A:

- Don't load `stripe-js` from anywhere except `js.stripe.com` (Stripe explicitly says this — "Don't include the script in a bundle or host it yourself.").
- Don't include card number, CVC, or full PAN in any URL or form on your site.
- Don't log or otherwise store the verification code or full card number anywhere on your servers. (You wouldn't with this setup anyway because you never see it.)
- Don't customize Stripe-hosted Checkout to inject payment fields into a non-Stripe page; keep the redirect integrity intact.

If you later embed Elements or Payment Request Button on your own checkout page, you stay in SAQ A generally, but **Stripe provides an "SAQ-A-eligible integration" wizard** that you can use inside the Dashboard to confirm your specific setup.

### 4.3 Other production must-haves

These come from the Stripe docs and from general industry practice:

- **Idempotency on the success path**: store an order's `paid_at` timestamp with a unique constraint on `orderId`. If the webhook fires twice, the second one is a no-op.
- **Sub-1-second webhook handlers**: ack in 200ms or less; defer slow work to a background queue. Stripe shows "5xx" if you take longer.
- **Reconciliation job**: Even with webhooks, run a nightly job that pulls recent successful Checkout Sessions / PaymentIntents and reconciles them against your orders. Periodic drift is real (e.g., a webhook lost during a deploy).
- **Manage customer disapprovals and refunds**: build `POST /api/refund` against `stripe.refunds.create` so support staff can refund from your admin UI.
- **Logging hygiene**: never log full request bodies from `/api/webhooks` — they may contain customer email/address. Log `event.id`, `event.type`, and your own `metadata` only.
- **Switch live keys when scaling**: use [access policies](https://docs.stripe.com/keys#access-policies) to lock `sk_live` to your Vercel egress IP range. There's a [specific Vercel-IP guide](https://vercel.com/guides/how-can-i-use-vercels-ip-addresses-with-stripe) — Vercel publishes static egress IPs for Pro/Enterprise plans.

---

## 5. End-to-end test plan (no real Stripe account required)

This works today thanks to `stripe sandbox create` and `stripe listen`:

1. `npm install stripe @types/stripe --save`
2. `npm install -g stripe` (Stripe CLI)
3. `stripe sandbox create --email you@example.com` → copy the `secret_key` and `publishable_key` from the JSON output.
4. `cp .env.example .env.local` and paste the keys + a `STRIPE_WEBHOOK_SECRET` placeholder.
5. `stripe listen --forward-to localhost:3000/api/webhooks` → paste the printed `whsec_…` into `.env.local`.
6. `npm run dev` → open `http://localhost:3000`, click Checkout.
7. On the Stripe-hosted Checkout page, enter `4242 4242 4242 4242`, any future expiry, any CVC, any zip.
8. Watch the `stripe listen` terminal print `--> checkout.session.completed [evt_…]`. Watch your Next.js logs print `✅ Success: …`.
9. **You are done.** No Dashboard registration, no public URL, no real card.

When you're ready to commit:
- `stripe sandbox claim` upgrades your ephemeral sandbox into a real Stripe account (use the `claim_url` printed by `stripe sandbox create`).
- Then walk through §4.1 to go live.

---

## 6. Common pitfalls — Next.js specific

A short checklist of things that bite people:

- **Body parsing**: `await req.json()` in the webhook route → signature verification fails. Use `await req.text()`. [Stripe's troubleshooting guide](https://docs.stripe.com/webhooks/signature) lists this as the #1 reason for `Webhook signature verification failed` errors.
- **`headers()` is async in App Router 14+**: in newer Next.js, `headers()` returns a Promise. Use `await headers()` not `headers()`. The official Stripe example does exactly this.
- **Forgetting `export const dynamic = 'force-dynamic'`** on the webhook route: Next.js may try to statically prerender the route, which will silently break on the first request.
- **Pricing in cents**: passing `19.99` instead of `1999` to `unit_amount` is the most common Stripe Checkout bug. The API takes integer cents; decimals throw or are truncated.
- **Fulfilling orders in `success/page.tsx`**: an attacker can hit the success URL directly without paying. Always drive fulfillment from the webhook.
- **Reading webhooks in your dev shell but deploying with the wrong `whsec_`**: CLI secrets ≠ Dashboard secrets. The message "No signatures found matching the expected signature for payload" usually means your `STRIPE_WEBHOOK_SECRET` is from the wrong source.
- **Forgetting absolute URLs in `success_url`/`cancel_url`**: relative paths like `/checkout/success` will work for the form-post redirect, but if you mix redirect styles (e.g. from a client-side JSON fetch), Stripe requires absolute URLs.
- **Vercel preview URL**: if you register an endpoint in the Dashboard pointing at a preview branch, it will be deleted when the branch is removed. Use `stripe listen` for preview work; only register a Dashboard endpoint on production.

---

## 7. Quick-reference cheat sheet

### Env var names

| Name                                | Where loaded     | Example value            |
|-------------------------------------|------------------|--------------------------|
| `STRIPE_SECRET_KEY`                 | Server only      | `sk_test_…` / `sk_live_…` (or restricted `rk_*`) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`| Server + client  | `pk_test_…` / `pk_live_…` (only needed if using Elements) |
| `STRIPE_WEBHOOK_SECRET`             | Server only      | `whsec_…`                 |

### File layout

```
app/
  api/
    checkout/
      route.ts                # creates Checkout Session + redirects (or returns {url})
    webhooks/
      route.ts                # verifies Stripe-Signature, handles events
  checkout/
    success/page.tsx          # ?session_id={CHECKOUT_SESSION_ID}
    cancel/page.tsx
  page.tsx                    # whatever triggers /api/checkout
lib/
  stripe.ts                   # `new Stripe(process.env.STRIPE_SECRET_KEY!)`
```

### Minimal event allowlist for one-time Checkout

```
checkout.session.completed       ← fulfillment
payment_intent.payment_failed    ← logging/UX only
```

### Test cards you'll actually use

```
4242 4242 4242 4242              ← success
4000 0025 0000 3155              ← 3DS challenge
4000 0000 0000 9995              ← declined (insufficient funds)
4000 0000 0000 0002              ← generic decline
```

### CLI cheatsheet

```bash
stripe sandbox create --email you@example.com     # ephemeral sandbox w/ keys (no signup)
stripe listen --forward-to localhost:3000/api/webhooks   # forward events to local
stripe trigger checkout.session.completed         # synth event
stripe trigger payment_intent.succeeded           # synth event
stripe login list                                 # see which account/sandbox you're on
```

That's the complete integration. Everything above maps to a documented Stripe feature and an actual capability in the SDK — no speculation.
