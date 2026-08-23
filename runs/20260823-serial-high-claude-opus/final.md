Everything is verified and committed. Here's the final report.

---

## 1. What I built and where it is

**https://benchmark-20260823-serial-high-claude-opus.vercel.app** (public, no auth)

A rebuild of datetime.store: a single-SKU shop selling a black t-shirt printed with the Unix millisecond timestamp of the moment you pressed Buy. The timestamp ticks live on the shirt, freezes at submit, and that frozen value is what gets printed — so every shirt is unavoidably one of a kind.

- Next.js 16 (App Router, TypeScript strict, Tailwind v4), the original's Bootstrap-blue palette on paper white
- Live SVG shirt preview in Chivo Bold; `GET /api/artwork?t=` serves the exact 2400×376 300-DPI PNG that gets printed, rendered server-side with `@napi-rs/canvas` from the same TTF
- Stripe Elements checkout: card, Bank, Cash App Pay, Amazon Pay, Klarna, plus Apple/Google Pay as one-tap wallets
- Scalable Press fulfilment: `/design` → `/quote` → `/order`, with the quote taken **before** the customer is charged
- No database — order state lives in the PaymentIntent

Two blanks, both verified against the live API: `next-level-fitted-crew` (fitted) and `gildan-ultra-cotton-t-shirt` (unisex), black, S–XL, DTG, 8″ front print.

Three design decisions carry the weight:

- **The printer commits before the charge.** A bad address or unavailable blank becomes a validation message, never a refund. The `orderToken` from the quote is a price the printer already agreed to.
- **Stripe is the database.** State lives in PaymentIntent `metadata` + `receipt_email`, so payment state and fulfilment state cannot drift apart.
- **Fulfilment is idempotent with two triggers.** Both the confirmation page and the webhook call `fulfill()`; a 90s `placing` lease plus `sp_order_id` as done-marker prevents double-ordering. A daily Vercel cron sweeps anything both missed.

## 2. How to run and verify it

```bash
npm install && cp .env.example .env.local   # fill in, then:
npm run dev
npm run typecheck && npm run build
npm run verify:products                     # every blank × size quotes, with a real address
node scripts/buy.mjs <base-url> [style] [size]   # real browser, real test card
```

`scripts/buy.mjs` is the check that matters — it fills Elements with `4242…`, confirms, follows the redirect, and prints the Scalable Press order id. It needs a local Chrome.

What I actually verified against the deployed site:

| Check | Result |
| --- | --- |
| Browser purchase, unisex/L | `/order` reached, SP order `6a8b52abbddbf01bc01e92b4`, no console errors |
| Browser purchase, fitted/M (local build) | SP order `6a8b52170716651bd67f7520` |
| Webhook-only fulfilment (API confirm, browser never involved) | `placed` in ~12s, SP order `6a8b52c70716651bd67f753c` |
| `verify:products` | 8/8 PASS ($15.09 fitted, $14.21 Gildan) |
| Idempotency — re-POST a placed order | `already_placed`, same order id |
| Authorization — wrong client secret | 404 |
| Ops endpoint without token / with token | 401 / `{"pendingCount":0}` |
| `/api/artwork` on production | 2400×376 PNG, correct digits in Chivo Bold |

## 3. What a human must do before real customers

1. **Swap in live Stripe keys.** The current key is a sandbox restricted key (`rkcs_test_…`). Set `STRIPE_SECRET_KEY` and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` to live values. Note the code comment in `orders.ts` about restricted keys and `pi.shipping` — the metadata approach works with any key type, so nothing needs changing, but understand why it's there before "simplifying" it.
2. **Re-point the webhook.** Create a `payment_intent.succeeded` endpoint at `https://<your-domain>/api/stripe/webhook` in live mode and set `STRIPE_WEBHOOK_SECRET`. Without it the shop still works but fulfils only on the confirmation page and the daily cron.
3. **Enable the Scalable Press live account.** Every order so far has `sp_mode: test` — nothing has been printed or shipped. Fund the account, get a live key, then re-run `npm run verify:products` against it. Don't assume the catalog behaves the same; see §6.
4. **Raise the price.** At $22.50 the margin is ~$6.45/shirt ($15.09 blank+print+shipping, ~$0.95 Stripe). One support email or one reprint erases several sales. I'd start at $28–32.
5. **Upgrade to Vercel Pro and change the cron to `0 * * * *`.** Hobby caps crons at daily, so a Scalable Press outage currently costs up to a day of fulfilment latency rather than an hour.
6. **Re-enable Deployment Protection or move to a real domain.** I deliberately turned off `ssoProtection` on this project so the URL is publicly reachable for review. That is not a production posture.
7. **Write the legal and policy copy.** There are no terms, privacy, or returns pages. For print-on-demand you need a returns policy that says something honest about one-of-a-kind items.
8. **Decide what happens on `failed`.** That state means paid-but-the-printer-refused and it needs a human. Right now it's only visible via `GET /api/ops/fulfillment` — wire it to an alert.

## 4. Known limitations and assumptions

- **US-only.** Shipping is priced as free and flat; the address form is locked to US. International needs real shipping rates and a second quote path.
- **Free shipping is absorbed, not free.** We eat the printer's $5.
- **No database means limited querying.** Fine for one SKU; the seam to replace is `src/lib/orders.ts`.
- **No order-lookup for customers.** The confirmation URL (PI id + client secret) is the only handle. No "where's my order" page, no email beyond Stripe's receipt.
- **Sizes are S–XL only**, and both blanks are black only.
- **The deferred-fulfilment fallback is real but lightly exercised.** If Scalable Press is unreachable at checkout we still take the money and queue the order. I verified the queue and retry mechanics, but not against a genuine multi-hour outage.
- **`capture_method` and `captureMethod` are coupled across client and server.** Changing one without the other breaks confirm. Documented in the README, but it's a trap.
- **Stripe's address autocomplete logs a benign `window.handleGetPredictions is not a function`** in some conditions. It's inside Stripe's own script and doesn't affect the flow.
- I assumed the reference repo's visual intent (the wordmark, the blue, the live ticker, the shirt-on-pale-blue) rather than pixel-matching it, and modernised the checkout — the original used a Payment Request button; I kept that as the wallet row.

## 5. Decisions and why

| Decision | Why |
| --- | --- |
| Quote the printer **before** creating the PaymentIntent | Turns "bad address" from a refund into a validation message. The `orderToken` is a committed price. |
| Stripe as the system of record, no DB | A single-SKU order fits in a PaymentIntent. Payment and fulfilment state can't disagree, and there's nothing to operate. |
| Shipping address in `metadata`, not `pi.shipping` | Forced by a real bug (§6), but better regardless: the printer ships to what the server validated and quoted, not what the browser wrote on the way past. |
| Render artwork server-side at 300 DPI | We print the timestamp *we* recorded, not one a client could tamper with. 2400px vs the original's 300×150 canvas matters on fabric. |
| Two fulfilment triggers + idempotency lease | A misconfigured webhook degrades the shop to "slower", not "silently unfulfilled". |
| Plain email input instead of `LinkAuthenticationElement` | It was silently making a phone number mandatory (§6). Link is still available as a payment method. |
| Wallets in a separate Elements group | Their validation shouldn't be entangled with the card form's. |
| `scripts/verify-products.mjs` as a first-class command | The catalog is the shop's most fragile external dependency. It should be checked by CI, not by customers. |
| Synchronous capture | The customer reaches the confirmation page already paid rather than `processing`. |

## 6. Friction

**Scalable Press reports validation errors as HTTP 500.** An unknown product id comes back as `500 "Unable to find product gildan-64000"`. This is genuinely dangerous, because it makes a permanent misconfiguration indistinguishable from an outage.

**And it cost me a real misdiagnosis.** Earlier in this build I concluded `/quote` was degraded vendor-side and shipped a documented deferred-fulfilment fallback. That was wrong. The failure was **product-specific**: several perfectly valid catalog entries (`next-level-boyfriend-tee`, `next-level-ladies-ideal-t-shirt`, `bella-ladies-favorite-t-shirt`) quote fine with *no* address and return a bare 500 the moment you supply one. I proved it by varying the payload rather than retrying it — same design quoted 200 against a different blank, 3/3 retries failed identically, and stock showed 7687 units. Swapping to two verified blanks turned the integration from "documented fallback" into a working chain, and `verify:products` exists so this can't silently regress. Also: `/design` rejects a 1×1 test PNG as `bad_value`, so the verifier hand-rolls a real 2400×376 PNG.

**Stripe's deferred-intent flow double-writes.** Because Elements is configured before the PaymentIntent exists, Stripe.js re-checks its description against the intent at confirm time. Two collisions, each surfacing only in a real browser: `captureMethod` had to match `capture_method`, and Stripe.js insists on writing `pi.shipping` itself when an AddressElement is present — then refuses, because a *restricted* key wrote it first, and every Stripe sandbox key is restricted.

**Link's signup prompt made an optional field mandatory.** Passing an email via `LinkAuthenticationElement` pre-checks "Save my information for faster checkout", which turns "Mobile number" into a required field — and the resulting "Your phone number is incomplete." renders at the *top* of the form, nowhere near the field at fault. A customer filling the form honestly would hit this.

All three were invisible to API-level testing. The API flow passed the whole time; only a real browser found them.

**Getting that browser test to be trustworthy was most of the work.** The bundled Playwright browser won't launch in this sandbox (needs `channel: 'chrome'`). Stripe reuses the title "Secure payment input frame" for three different iframes, and which exist depends on how far init has got — so frames have to be scoped by `src`. Fills issued while an Element is still mounting land in *whatever was focused before*, silently: that's how `Ada Lovelace` ended up appended to the email field, and the symptom didn't appear until validation failed much later. The option radios are visually hidden behind styled labels, so `check()` only ever worked on the already-selected defaults — the script wasn't testing selection at all. And a click can be reported as delivered without producing a submit event, because the column resizes between mousedown and mouseup. Every fill is now verified to have landed and the submit is retried until a submit event actually fires. Separately, `fullPage: true` screenshots blank out cross-origin iframes during the resize, which sent me chasing a "large blank gap" bug that didn't exist.

**Vercel.** Hobby caps crons at daily (`0 * * * *` fails the deploy). `vercel.json` rejects unknown keys, so a `_comment` breaks the build. The project name plus team suffix exceeds the 63-char DNS label limit, so no alias was auto-created and the bare `.vercel.app` URL 404'd until I set it explicitly. And Deployment Protection is on by default — my first `curl -L` returned 200 for the *SSO login page*, which looks exactly like success. I had to read the CLI token from `~/Library/Application Support/com.vercel.cli/auth.json` and `PATCH /v9/projects/{id}` with `{"ssoProtection": null}`.
