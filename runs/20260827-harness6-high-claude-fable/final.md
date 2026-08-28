Both styles now verified end-to-end (`ord_1169333` unisex/L, `ord_1169334` fitted/S). Everything is deployed and working.

---

# datetime.store — rebuilt and deployed

**Live URL: https://benchmark-20260827-harness6-high-cl-iota.vercel.app** (Vercel project `benchmark-20260827-harness6-high-claude-fable`, production deployment, publicly reachable)

## 1. What I built

A faithful, modernized rebuild of datetime.store: a one-page shop selling a black tee printed with the Unix epoch **millisecond** at which you press "Buy now". The original's core experience is intact — live-ticking milliseconds rendered on the original SVG shirt silhouettes, Fitted/Unisex styles, S–XL sizes, ~~$30.00~~ $22.50 with free shipping, Chivo type, the Bootstrap-blue visual language, and the "Congrats on your pretty cool shirt!" success state.

- **Stack:** Next.js 15 (App Router, TypeScript) on Vercel.
- **Payments:** Stripe Checkout (hosted) in a provisioned Stripe sandbox. The buy click freezes the timestamp client-side; the API validates it against server time (±5 min) and embeds it in session metadata.
- **Artwork:** generated on demand at `/api/artwork?ts=…` with `next/og` — white Chivo digits on a transparent 2400×800 PNG (300 dpi for an 8″ chest print, matching the original print spec), plus a black `variant=preview` tile shown as the product image inside Stripe Checkout.
- **Fulfillment (replacing Scalable Press):** a Stripe webhook (`checkout.session.completed`, signature-verified) places a Prodigi sandbox order — Fitted → `GLOBAL-TEE-BC-6004` (Bella+Canvas), Unisex → `GLOBAL-TEE-GIL-64000` (Gildan), black, `fitPrintArea`, artwork URL with the frozen timestamp. Idempotency is double-layered: Prodigi `idempotencyKey` = session id, and the Prodigi order id is written back to the PaymentIntent metadata and checked before ordering.

## 2. How to run and verify

Visit the URL, pick style/size, press **Buy now**, and pay with test card `4242 4242 4242 4242` (any future expiry/CVC, any US address). You'll land on `/success` showing your frozen millisecond; the Prodigi order id (`ord_…`) appears within seconds. Cross-check with `stripe charges list --limit 1` and `GET https://api.sandbox.prodigi.com/v4.0/Orders/{id}`. Local dev instructions are in `datetime-store/README.md`; a scripted Playwright checkout lives in `e2e/checkout.mjs`.

**I verified the complete flow twice headlessly** (both styles): $22.50 charges succeeded in Stripe, both Prodigi orders exist in `InProgress` with correct recipient, SKU/size/color, and fetchable artwork URLs. Also verified: artwork PNGs render correctly (visually inspected), bad webhook signatures are rejected (400), invalid checkout input is rejected (400).

## 3. Steps to get ready for real customers

1. **Claim the Stripe sandbox before 2026-09-04** (it auto-expires): run `stripe sandbox claim` or open the `claim_url` stored in the Stripe CLI config, then move to a real Stripe account, complete business activation, and swap `STRIPE_SECRET_KEY` to a live key.
2. **Create a live-mode webhook endpoint** for `checkout.session.completed` pointing at `/api/stripe-webhook` and update `STRIPE_WEBHOOK_SECRET`.
3. **Get a live Prodigi account/key**, set `PRODIGI_API_KEY` and `PRODIGI_API_BASE=https://api.prodigi.com`. Order one physical sample per SKU to check print position/quality (satori's font rendering should be print-fine, but verify).
4. **Buy a domain** (datetime.store equivalent), add it to the Vercel project, and set `PUBLIC_BASE_URL` to it (this URL is baked into Prodigi artwork links and Stripe redirects).
5. Enable **customer receipt emails** in Stripe settings (test mode doesn't send them) and consider Prodigi shipment-callback webhooks for "your shirt shipped" emails.
6. Review **pricing**: landed sandbox cost is ~$17.00–$18.35/shirt against $22.50 retail with free shipping — thin but positive; international shipping will exceed margin, so either restrict countries (currently 19 allowed) or charge shipping outside the US.
7. Add Terms/Privacy/returns pages before going live.

## 4. Known limitations / assumptions

- Orders live only in Stripe + Prodigi metadata — there's no database. Fine at this product's scale; add one if you want an admin view.
- If a customer's checkout session sits >5 minutes before paying, the printed millisecond is the buy-click moment, not the payment moment (faithful to the original's behavior).
- The original's Payment Request Button / inline card form was replaced by hosted Stripe Checkout (Apple/Google Pay still offered there automatically).
- Failed fulfillments return 500 so Stripe retries with backoff for ~3 days; a persistently failing order needs manual follow-up from the Stripe dashboard (the PaymentIntent will lack `prodigi_order_id`).
- The success page shows "being placed…" and auto-refreshes ~30 s; extremely slow webhooks past that require a manual reload.

## 5. Key decisions and why

- **Hosted Stripe Checkout over rebuilt Elements forms** — PCI-scope-free, handles address collection/validation, wallets, and modern payment methods; the original's hand-rolled form predates Checkout's existence.
- **Server-generated artwork at a stable URL** instead of the original's client-canvas upload — Prodigi requires a fetchable asset URL anyway, it can't be spoofed by a tampered client, and the same endpoint yields the Checkout product image.
- **Webhook-driven fulfillment with dual idempotency** — survives closed browser tabs (the original fulfilled in the request path) and retried events without double-printing.
- **SKU choices** mirror the original's garment intent (Next Level boyfriend/fitted crew → Bella+Canvas women's fitted + Gildan unisex softstyle), validated against sandbox quotes to the US.
- Kept the **$22.50 price, free shipping, copy, and layout** to preserve the product's character.

## 6. Friction encountered

- `stripe login` device flow needs a browser, so I provisioned a claimable sandbox via `stripe sandbox create` instead — hence the claim deadline above.
- Next 15's webpack couldn't resolve the satori font via `new URL(...)` at first — turned out my shell's cwd had drifted and the `.ttf` was downloaded into the wrong directory; once moved next to the edge route it bundled fine.
- Automating hosted Stripe Checkout took a few iterations (Card is an accordion, and the Link "save my information" checkbox silently demands a phone number).
- The first print render clipped the 13-digit number at the canvas edges; caught by visual inspection and fixed by reducing font size.
