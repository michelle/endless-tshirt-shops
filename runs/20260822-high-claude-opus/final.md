Done and verified end to end on the deployed environment.

## 1. What was built and the deployed URL

**https://benchmark-20260822-high-claude-opus.vercel.app**

A rebuild of datetime.store: a one-product storefront selling a black t-shirt printed with the current epoch millisecond. The number ticks live on an SVG shirt; whatever it reads the instant you press buy is what gets printed. Original copy, layout intent, two shirt SVG paths, `$30.00 → $22.50` pricing, and blue accent are preserved from the reference.

Stack: Next.js 16 App Router, React 19, Tailwind v4, Stripe deferred PaymentIntents + Payment/Address/Express Checkout Elements, Scalable Press v2 for fulfillment.

The order flow:
1. Customer picks cut and size; the browser renders the frozen timestamp as a 2400×560 PNG at 300 DPI.
2. `POST /api/checkout` validates the order, uploads artwork to Scalable Press (`/v2/design`), gets a real quote against the shipping address (`/v2/quote`), and only then creates a PaymentIntent carrying the quote token in metadata.
3. Client confirms payment.
4. `payment_intent.succeeded` webhook places the print order (`/v2/order`).

Quoting *before* charging means a bad address or unavailable garment fails before the customer's money moves, not after.

**There is no database** — the PaymentIntent is the order record. Design id, quote token, cut, size, printed epoch, shipping address, and `sp_order_status` all live in its metadata. Fulfillment runs from both the webhook and `GET /api/orders/:id` as a self-healing fallback; it's idempotent because Scalable Press rejects a second placement with `already in state`, which we treat as success.

## 2. How to run and verify it

```bash
npm install
cp .env.example .env.local   # fill in the four keys
npm run dev
```

Two verification scripts, runnable against local or deployed URLs:

```bash
BASE_URL=https://benchmark-20260822-high-claude-opus.vercel.app npm run verify
PLAYWRIGHT_CHANNEL=chrome BASE_URL=https://benchmark-20260822-high-claude-opus.vercel.app npm run verify:browser
```

Against the live deployment: **13/13 API checks** and **9/9 browser checks** pass. The browser run drives the real Stripe Elements iframes with `4242 4242 4242 4242`, completes a purchase, lands on the confirmation page, and writes screenshots to `./screenshots`. The API run confirms server-side with `pm_card_visa` and additionally asserts the print order is withheld until payment succeeds, that order details 403 without the client secret, that fulfillment is idempotent, and that invalid artwork and stale timestamps are rejected.

Webhook delivery is confirmed in production from Vercel logs — `POST /api/webhooks/stripe` → 200 with `[fulfill] order placed`, signature verification passing. All Scalable Press responses report `"mode":"test"`, so nothing is actually printed.

## 3. Remaining configuration or launch steps

- **Swap in live keys** and rebuild (the publishable key is inlined at build time, so a restart isn't enough). The test-mode banner disappears automatically for any `pk_live_` key.
- **Repoint the webhook** at the live-mode endpoint and set the new signing secret.
- **Reprice.** $22.50 is below cost — see limitations.
- **Verify a domain with Apple Pay** to enable the wallet button (the Express Checkout Element is wired up and self-hides when no wallet is present).
- Optional: real transactional email beyond Stripe's receipt, and a shipment-tracking view (Scalable Press exposes order status by token).

## 4. Known limitations and assumptions

- **US only** — Scalable Press shipping and the original store were both US-only, so the Address Element is restricted to `US`.
- **Artwork is rendered client-side.** The server validates it's a real PNG of plausible print dimensions and size-caps it, but cannot verify the digits match the claimed timestamp. The timestamp recorded in metadata *is* server-validated (rejected if >5 min ahead or >6 h behind the server clock). Rendering server-side would need a rasteriser with a real font face.
- **The fitted cut uses a different garment.** The original's `next-level-boyfriend-tee` now returns HTTP 500 from `/v2/quote`; fitted is `gildan-ladies-missy-t-shirt`. `next-level-fitted-crew` (unisex) is unchanged.
- **Wallet payments are untested end to end** — they need a real device and a verified domain.
- **$22.50 is below cost.** Scalable Press quotes ~$15.09 wholesale plus shipping. The original's price is kept deliberately for fidelity.
- **One colour, one print position** — black garment, white ink, 8" across the chest, 3" down, as the original had it.
- No admin view; order lookup requires the Stripe client secret, so there's no way to browse orders outside the Stripe dashboard.

## 5. Decisions and why

**Deferred PaymentIntents.** Elements is created with `mode: 'payment'` and a known amount; the intent is created on submit, after the print job is quoted. This gives one code path for both the card form and the wallet button, and means no intent exists for an order the printer would reject.

**No database.** Storing fulfillment state in PaymentIntent metadata eliminates a whole class of "Stripe says paid, our DB says pending" bugs and lets a preview deployment run with zero provisioning. For a single-SKU store with no accounts, the tradeoff is clearly right; a real catalogue would need Postgres.

**Fulfil from two paths, idempotently.** The webhook is authoritative, but the confirmation page also attempts fulfillment. A fresh deployment therefore works correctly before anyone configures a webhook — and Scalable Press's `already in state` rejection makes the race safe rather than merely unlikely.

**Artwork at 300 DPI in the browser.** The original screenshotted the small on-screen preview canvas, which upscaled badly at print size. Rendering a dedicated 2400px canvas costs nothing and prints cleanly.

**`capture_method: 'automatic'` pinned explicitly** on both sides — Stripe defaults new intents to `automatic_async` while Elements defaults to `automatic`, and confirmation is refused if they disagree.

**Shipping is not set on the PaymentIntent server-side.** Stripe writes it from the Address Element at confirmation, and an intent whose shipping was set with a secret key cannot be updated from the browser. Our own copy in metadata is the printer's record.

**Test-mode banner** on any non-live key, so a demo deployment always says what it is.

## 6. Friction

- **Stripe Projects could not be used.** `stripe projects init` requires interactive browser OAuth; `--json --non-interactive` returns `SANDBOX_ACCOUNT: Claimable sandbox detected. Run stripe projects init to complete browser-based setup.` Not resolvable autonomously. I proceeded with the existing sandbox's restricted key, verified by direct API call that it creates PaymentIntents (it 403s on `/v1/balance`, which is a red herring), and it also turned out to have webhook-endpoint write permission, so the webhook was created via API.
- **Scalable Press's product catalogue has drifted since 2017.** The original's fitted garment 500s on quote. I probed seven guessed ids, then all 60 products in the `ladies-short-sleeve` category concurrently; exactly one quoted successfully. Also discovered `orderId` no longer appears in order responses — `orderToken` is the only reference — and that re-placement is naturally idempotent, which the architecture now leans on.
- **Playwright's bundled `chromium_headless_shell` was SIGKILLed at launch** on this machine even with the sandbox disabled. Added a `PLAYWRIGHT_CHANNEL` env option so the scripts can use system Google Chrome.
- **Stripe Elements selectors had to be discovered empirically.** All element iframes share indistinguishable `elements-inner-accessory` URLs, so the script scans frames for a probe selector rather than matching by URL, and uses `input[name="..."]` from a dumped DOM.
- **Two real integration bugs only surfaced under a live browser**, both now fixed: the shipping-set-with-restricted-key conflict, and the `capture_method` mismatch. A third — `Could not resolve '700 200px ' as a font` when `--font-chivo` hadn't resolved yet — was fixed with async font polling and a monospace fallback.
