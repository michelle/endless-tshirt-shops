Done. Here's the summary.

## 1. What I built and the deployed URL

**https://benchmark-20260820-claude-opus.vercel.app**

A rebuild of datetime.store: a black tee with the current Unix epoch millisecond printed on it. The clock ticks live on the garment, freezes the instant you press Buy, and that exact millisecond is what goes to print. Next.js 16 App Router, React 19, TypeScript strict, hand-written CSS, deployed to the Vercel project `benchmark-20260820-claude-opus`.

Carried over from the reference: the `datetime.store` masthead and tagline, both garment SVG paths (fitted/unisex), the `#a4d5ff` pill selectors, floating-label form, `$30.00` struck through to `$22.50`, Chivo numerals, and the "Congrats on your pretty cool shirt" success state.

## 2. How to run and verify it

```bash
npm install && cp .env.example .env.local   # fill in keys
npm run dev
curl -s localhost:3000/api/health | jq      # integration readiness
```

Buy with `4242 4242 4242 4242`, any future expiry/CVC/ZIP. A test-mode banner shows automatically while the publishable key is `pk_test_`.

I verified the deployed app with a real headless-Chrome purchase (typing into the Stripe iframe, not mocked). It passed on the live URL: clock ticks → cut/size swap the garment → clock freezes on submit → payment succeeds → receipt renders → "Get another shirt" resumes the clock. Zero console errors. Also confirmed server-side:

- All four fulfillment states (`ready`→`submitted`, `deferred`, `failed`, idempotent replay)
- Stripe records the shipping address, receipt email, design ID, and printed timestamp in PaymentIntent metadata
- The artwork uploaded from the browser is a genuine **2400×720** transparent PNG, and I rendered it back over dark grey to confirm it's print-ready

## 3. Remaining configuration

1. **Register the Stripe webhook** and set `STRIPE_WEBHOOK_SECRET` — the endpoint is implemented and signature-verified, but the sandbox key can't create webhook endpoints. Until then fulfillment relies on the browser call.
2. Swap in live Stripe + Scalable Press keys; the test banner disappears on its own.
3. Add a cron sweeping `fulfillment_state=deferred` PaymentIntents through `/api/fulfill`.
4. Alert on `failed` — that means a paid order needs a human.

## 4. Known limitations

**Scalable Press's order-ready quote endpoint is broken on their side.** `POST /v2/quote` returns `500` whenever an `address` is present — including for `"address": {}` and for the exact body in their own docs. Quote-only calls succeed and `POST /v2/order` is healthy (proper `404` for an unknown token), so it isn't my request shape.

I designed around it rather than letting it block the sale: checkout falls back to quote-only pricing, the payment completes, and the order parks in `deferred` for replay. The submission path is genuinely exercised — pointing it at a token Scalable Press doesn't recognise produces a correct non-retryable `failed`. When their endpoint recovers, orders flow to `submitted` with no code change. **The one thing I could not verify end-to-end is a real `orderId`.**

Also: US-only addresses (matching the original), flat $22.50 with shipping/tax absorbed, and no customer-facing order lookup.

## 5. Key decisions

- **PaymentIntents over the original's legacy charges+tokens.** SCA-ready, and the PaymentIntent doubles as the order record — so there's no database, yet fulfillment is idempotent and replayable.
- **Print work before the charge.** Design upload and quote run first, so a print failure means no money moved. Fulfillment is decoupled behind a state machine, with a webhook backstop so a closed tab can't lose an order.
- **SVG garment, separate 300dpi canvas for print.** The original reused one small 37px canvas for both preview and artwork — badly under-resolved for an 8" print. Preview is now crisp at any size; the print is rendered at press resolution with a transparent background so DTG inks only the pixels.
- **`textLength` on the print.** A 13-digit epoch can never spill past the seams regardless of which font loads. My first attempt overflowed the garment badly; I caught it in a screenshot.
- **Dropped Bootstrap 3 / react-bootstrap** for hand-written CSS — kept the palette and interaction model, shed the dependency weight.
- **Server-side validation treats the body as hostile**, including verifying the PNG magic number rather than trusting the data-URL prefix.

## 6. Friction

- **Stripe Projects needs browser auth.** `stripe projects init` returned `BROWSER_AUTH_REQUIRED`, which I can't complete autonomously — so I used the CLI's existing sandbox credentials instead. That key is a restricted `rkcs_test_` one: PaymentIntent create/update/retrieve all work (the full flow), but `balance` and `webhook_endpoints` are refused, which is why webhook registration is a manual step.
- **Vercel rejected Next.js 15.1.6** as a vulnerable version mid-deploy. Upgraded to 16.3.1 and re-verified everything.
- **Scalable Press auth is unusual** — the key is the basic-auth *password*, not the username. Passing it as the username gives a confusing `401 "No valid API key provided"`.
- The preview URL sits behind Deployment Protection (302s), so the reachable public URL is the production alias.
- Two self-inflicted snags: `waitUntil: 'networkidle'` never settles with Stripe.js loaded, and a non-breaking space slipped into a source file, silently breaking an exact-match edit.
