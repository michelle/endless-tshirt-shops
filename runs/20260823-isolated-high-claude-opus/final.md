Done and verified on the final deployment.

## 1. What was built and where it is

**https://benchmark-20260823-isolated-high-cl-hazel.vercel.app** (Vercel project `benchmark-20260823-isolated-high-claude-opus`, created fresh with `--name`)

A rebuild of datetime.store: a live-ticking datetime on a black tee, frozen the instant you click buy, printed on demand and shipped by Scalable Press. Next.js 15 App Router, React 19, TypeScript strict, Tailwind v4, Stripe Payment Element + Express Checkout Element, Scalable Press v2. Everything runs in test/sandbox mode.

The visual language of the original is reproduced closely — the same shirt SVG paths, the underline-style floating-label fields, the accent-blue price badge with struck-through list price, the chip-row size selector.

Three things I'd call out as more than a port:

- **No database.** The Stripe PaymentIntent *is* the order record (design id, order token, order id, cost, frozen timestamp in metadata). One SKU, no accounts, no inventory — so this removes a whole infrastructure tier and makes the Stripe dashboard the place a human actually looks.
- **Print-resolution artwork.** The original rasterised a ~37px canvas; this renders 2400px (8in @ 300dpi), white ink, tight-cropped, with digits on a fixed advance width so the live counter doesn't jitter.
- **Quote before charge.** `/api/checkout` uploads the design and gets a Scalable Press quote *first*, so a bad address fails with the printer's own error text before a PaymentIntent exists. No charge to refund.

## 2. How to verify

```bash
npm install && npm run typecheck && npm test && npm run build   # 61 tests
```

Live: buy a shirt with `4242 4242 4242 4242`. `/thanks` shows the frozen shirt and a Scalable Press order id within a few seconds. `GET /api/health` reports credential presence and test-vs-live without echoing secrets.

What I actually ran against the deployment: full purchases through both fulfilment paths (webhook-only, with `/api/order` untouched, and the poll path), each confirming a real Scalable Press test order — `"status": "order"`, `"mode": "test"`, correct product/size/timestamp, $15.09 cost against the $22.50 price. Plus idempotency (repeat calls, no duplicate), unauthorised order lookup → 404, unsigned webhook → 400.

`scripts/verify-purchase.mjs` drives a real browser purchase end to end. **I could not run it** — see limitations.

## 3. What you need to do before real customers

1. **Run the browser test.** `npm i --no-save playwright && npx playwright install chromium`, then `BASE=<url> node scripts/verify-purchase.mjs`. This is the one gap in my verification.
2. **Swap in live keys** and re-register the webhook against the live endpoint. `/api/health` will report `LIVE mode`, and the test-mode banner disappears on its own.
3. **Verify your domain for Apple Pay** in Stripe (Settings → Payment methods → Apple Pay). The Express Checkout Element is wired but Apple Pay won't render until you do.
4. **Turn on Stripe Tax.** Scalable Press charges *us* tax; we don't charge the customer. At $22.50 against $15.09 that eats real margin.
5. **Re-check the product mapping.** I remapped both fits (see #6) — confirm the blanks and colours are what you want to sell, and that `$22.50` still clears cost.
6. **Decide the failure alert.** Permanent fulfilment failures land as `sp_status: failed` + `sp_error` on the PaymentIntent. Nothing pages anyone; wire that to email or Slack.
7. **Add shipped-notification email.** Stripe sends a payment receipt; there's no "your shirt shipped".
8. **Note:** deployment protection is disabled on this project so the URL is publicly reachable.

## 4. Limitations and assumptions

- **Interactive browser QA not run.** Chromium is `Killed: 9` by the OS in this sandbox (correct arm64 arch, no quarantine flag). The server flow is verified end to end and the shipped client bundle is verified to contain the expected wiring (`shippingAddressRequired`, `redirect:"if_required"`, the manual-entry link), but nobody has clicked through it in a browser.
- US only — shipping quotes, ZIP regex, and the wallet handler all assume US.
- No sales tax collected, no admin UI, no shipped emails. Print ink is fixed white, assuming the black shirt.
- The Stripe *Projects* CLI plugin was unusable here (see #6), so the app is scoped to a standard test-mode account rather than a Stripe Project.

## 5. Key decisions

- **PaymentIntent as system of record** — justified by the single-SKU, no-accounts product; wouldn't hold if you added order history or variants.
- **Deferred intent creation** (`elements.submit()` → server creates intent → confirm) so the amount stays server-authoritative in `catalog.ts` and the client never sends a price.
- **Dual-path fulfilment** — webhook *and* the thank-you page's poll both call the same `fulfill()`. Either alone completes the order, so a misconfigured webhook doesn't lose a shirt and neither does a customer closing the tab. Safe because the Scalable Press `orderToken` can only be placed once.
- **Client secret as the auth token** for `/api/order` (constant-time compared) — gives per-order authorisation with no sessions or accounts.
- **Transient vs permanent errors are distinguished.** 5xx returns `placing` and the webhook answers 503 so Stripe retries; only permanent rejections write `sp_status: failed`. Money is already captured, so silently giving up is the worst outcome.

## 6. Friction

- **`stripe projects list` fails** with "Not logged in with a live mode account" — the Projects CLI plugin needs live-mode auth unavailable here. I used a standard test-mode restricted key instead.
- **Scalable Press quirks**, each a real debugging cost, all now encoded and documented: failures returned as HTTP 200 with `statusCode: 500` in the body; basic auth with *empty username*; `GET /order/{orderToken}` 500s (only `orderId` works); `zip` must be a string; and `next-level-boyfriend-tee` — the original store's product — now 500s on quote, so both fits were remapped.
- **`GET /order?limit=50` hangs for 45+ seconds** while `limit=25` returns in 40ms. This one caused a `FUNCTION_INVOCATION_TIMEOUT` in production; fixed by paging at 25 with an 8s abort on every request.
- **Two real bugs surfaced from an unexpected direction.** The Stripe test account is shared: four webhook endpoints are registered on it, three from other benchmark runs. Another run's app received *my* `payment_intent.succeeded`, placed my Scalable Press order using my `orderToken`, and wrote the id under a *different* metadata key. My recovery path was waiting for `sp_order_id`, so the webhook 503'd in a loop while the shirt was already printing. That exposed a genuinely production-reachable defect — **if `POST /order` succeeds but the write back to Stripe fails, the order id exists only at the printer and the order stalls forever.** Fixed by asking Scalable Press which order a token became (`findOrderIdByToken`) instead of trusting our own metadata; I confirmed the fix by watching the stalled order self-heal in 1.35s. I also added an `app: "datetime.store"` tag so we never print another application's PaymentIntent, and read order state from `sp_order_id` rather than `sp_status` since a foreign writer can clobber a status field. I left the other runs' webhook endpoints alone.
- Minor: `next/font` can't be exported from `layout.tsx` (moved to `src/lib/font.ts`); `vercel project add` creates a project with no framework preset, which fails the first build looking for a `public/` dir (pinned in `vercel.json`); and installing Playwright silently removed the `--no-save`-installed Vercel CLI, making one deploy a no-op.
