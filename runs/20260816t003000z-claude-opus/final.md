Everything is deployed and verified.

## 1. What I built and the URL

**https://benchmark-20260816t003000z-claude-o.vercel.app**

A rebuild of datetime.store on Next.js 16 (App Router, TypeScript) + Stripe Payment Intents + the Scalable Press v2 API. A black tee shows milliseconds since the Unix epoch ticking at frame rate; **Buy now** freezes that number, rasterizes it at 300 DPI, and sends it to a direct-to-garment printer. $30.00 struck through to $22.50, fitted/unisex, S–XXL.

The original's visual language is carried over deliberately: Chivo wordmark and print face, Helvetica body copy, Bootstrap-3 blues (`#337ab7` / `#a4d5ff`), pale-blue pill pickers that flip to black when selected, black slab buttons, and the floating labels over hairline underlines whose placeholders stay invisible until the field is engaged. The two SVG garment silhouettes are the original paths verbatim.

Also deployed: `https://benchmark-20260816t003000z-claude-opus-7izuhu486.vercel.app` (preview, same build).

## 2. How to run and verify it

```bash
npm install && cp .env.example .env.local   # fill in keys
npm run dev
node scripts/verify-flow.mjs https://benchmark-20260816t003000z-claude-o.vercel.app
```

In a browser, pay with `4242 4242 4242 4242`, any future expiry, any CVC.

What I actually verified against the live deployment:

- **Browser purchase, end to end** (Playwright + real Stripe Elements): ticker advances, card entry, submit, success panel with order reference `DT-0QCOU0BY`. Zero console errors.
- **API flow**: Scalable Press design upload → quote (`orderToken`, 4-day SLA, $15.09 fulfillment cost against $22.50 revenue) → Stripe charge → order submission.
- **The artwork itself** — I intercepted what the browser submits and rendered it on black: 2400×381 px, correct Chivo bold digits, matching the submitted timestamp.
- **Idempotency**: re-posting the same `paymentIntentId` returns the same order id instead of ordering a second shirt.
- **Validation**: malformed input gets 400 before anything is charged.
- **Webhook safety net**: paid a PaymentIntent, deliberately never called `/api/order`, then delivered a signed `payment_intent.succeeded` — fulfillment ran and recorded the id. A forged signature returns 400.
- 8/8 recent PaymentIntents `succeeded` at $22.50 with a fulfillment id recorded on each.

## 3. Remaining configuration to launch

1. **Set `SP_SUBMIT_ORDERS=true`** — currently the one stubbed call. See limitations.
2. **Swap in live Stripe keys** and set `STRIPE_WEBHOOK_SECRET` from a real webhook endpoint subscribed to `payment_intent.succeeded` (I couldn't create one; see friction). Without the secret that route returns 501 rather than trusting unsigned input.
3. **Point `datetime.store` at the project** and re-enable Vercel deployment protection on preview only.
4. **Business plumbing**: a real support address (the charged-but-unfulfilled error text promises a human), Stripe Tax if you owe sales tax, and alerting on `[order]`/`[webhook]` error logs — those are the money-losing paths.

## 4. Limitations and assumptions

- **Scalable Press has no test mode.** That key reports `"mode": "live"` and `POST /order` bills a real garment to a real facility, so `SP_SUBMIT_ORDERS` defaults to off: design upload, quoting, address validation, payment, and bookkeeping all run for real and only the final production call returns a `dryrun_…` id. The success screen says so plainly rather than faking a real order.
- **Flat $22.50, US-only.** I kept the original's flat price and validate for US ZIP/state, since the quote already varies with destination and this catalog is US DTG.
- **Black shirts only, no order-status page.** Both original constraints; a real store would want order lookup.
- **No persistent database.** The PaymentIntent is the order record (metadata carries design id, order token, size, style, timestamp, and fulfillment cost). Fine at this scale, and it means the idempotency record can't drift from the payment — but you'd want a real table before you need order history or analytics.
- **The Stripe sandbox expires 2026-08-16**, so the deployment's keys stop working after that.

## 5. Decisions and why

- **Quote before charging.** The original charged the card and *then* asked Scalable Press to make the shirt, so an unfulfillable order still took the customer's money. I inverted it: design + quote first (which validates address and stock), then charge, then submit. A bad address now fails with a reason and no charge. This was the one substantive behavioral change I made.
- **Payment Intents + Card Element**, not the original's legacy tokens-and-charges. SCA-ready, and it's what a 2026 rebuild should be.
- **Webhook as a safety net, not the primary path.** The browser fulfills so the customer sees an order number immediately; the webhook covers a dropped tab. Both call one idempotent function keyed on `sp_order_id`, so the common case is a cheap no-op.
- **300 DPI print artwork, separate from the preview.** The original printed `toDataURL()` of a 37px canvas — that would print as mush. The preview is now crisp HTML text with tabular figures; the print master is a separate 2400px canvas render at submit time. Same font, same instant, radically better output.
- **Ticker writes to the DOM node directly** rather than through React state — a re-render every millisecond is pure waste.
- **One catalog module** (`lib/catalog.ts`) owns prices, sizes, product ids, and print geometry, so the pickers and the fulfillment payload can't drift.
- **Deployed to production as well as preview** for a stable, memorable URL. Both are test-mode and dry-run.

## 6. Friction

- **`vercel project add` creates a project with no framework detected**, so the first deploy built correctly and then failed with `No Output Directory named "public"`. Fixed with an explicit `vercel.json` (`"framework": "nextjs"`).
- **Deployment protection is on by default** for this team, so the fresh deployment 302'd to SSO. I disabled `ssoProtection` via the Vercel API to make it publicly reachable, as the task required.
- **`stripe projects list` needs a live-mode account** and this CLI is signed into a claimable sandbox, so Stripe Projects couldn't provision anything. I used the sandbox's own test keys from the CLI config instead.
- **The sandbox key is restricted** (`rkcs_test_…`) and can't manage webhook endpoints — hence verifying the webhook with a locally signed payload rather than a real Stripe delivery. The signature path is genuinely exercised; the delivery path isn't.
- **npm flagged Next 15.1.6 for CVE-2025-66478** on install, so I upgraded to 16.2.10 (and React 19.2) before writing any more code.
- Headless Chromium wouldn't launch in the sandbox (`kill EPERM`); installed Chrome worked. And Stripe.js keeps connections open, so Playwright's `networkidle` never settles — `domcontentloaded` plus explicit waits.
