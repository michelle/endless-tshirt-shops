## Done — datetime.store is live

**https://benchmark-20260905-unserious-high-c-silk.vercel.app**
(Vercel project: `benchmark-20260905-unserious-high-claude-claude-sonnet-5`)

### What it is
Same joke as the original repo — "we sell a t-shirt with the current datetime on it" — rebuilt from scratch as a proper Next.js 15 (App Router, TypeScript, Tailwind) app. You pick a color/size (cosmetic), the shirt preview ticks live epoch-millisecond time, and clicking **"Freeze this exact millisecond"** captures `Date.now()` at that instant and buys a real (sandbox) print order with that number screen-printed on it forever. FAQ, "how it works," and copy all lean into the bit.

### What's real under the hood
- **Stripe Checkout** (test mode) — hosted payment page, shipping address + phone collection, Apple Pay/Google Pay/Klarna/Cash App available automatically.
- **Stripe webhook** (`checkout.session.completed`) → renders the frozen timestamp as a print-ready PNG on the fly (`next/og`) → creates a **real Prodigi sandbox order** (SKU `GLOBAL-TEE-GIL-64000`, a real Gildan tee) with that artwork on the front, shipped to the buyer's address. Idempotency key = Stripe session id, so retried webhooks can't double-print.
- I verified this **end-to-end twice** with Playwright driving Stripe's hosted checkout with test card `4242 4242 4242 4242`: both times it paid, redirected to `/success`, and produced a real order in Prodigi's sandbox (`ord_1170599`, `ord_1170600`) with correct recipient, address, color/size, and downloadable artwork.

### How you can test it
1. Visit the site, pick a color/size, click the buy button.
2. On Stripe's checkout page: any email, any name/US address, test card **4242 4242 4242 4242**, any future expiry, any CVC.
3. You'll land on `/success` showing your frozen shirt; check the Prodigi sandbox dashboard for the resulting order if you want to see fulfillment.

### Stripe keys — how I got them, and one thing you need to do
You said to get a Stripe test key myself — `stripe sandbox create --email analogmidnight@gmail.com --non-interactive` provisioned a real, working **claimable Stripe test-mode sandbox** without needing browser interaction, and I wired its keys + a webhook endpoint straight into the Vercel project's env vars. One catch: it's **unclaimed**, so **it expires 2026-09-13** — you (analogmidnight@gmail.com) need to claim it before then at:
`https://dashboard.stripe.com/onboard_sandbox/YWNjdF8xVUNYdUFFM3o2Mk5lNkR2LDE3ODkyNzk0OTQv100acd6fvlH`
After that it's a normal Stripe account you control; the same test keys keep working. I saved a memory note about this deadline.

Prodigi is wired to the sandbox key you provided (`PRODIGI_API_URL=https://api.sandbox.prodigi.com`) — no action needed there, but sandbox orders never actually print/ship.

### Known gaps
- **No database** — fulfillment is fire-and-forget from the webhook; there's no order-history page or admin view.
- **One SKU** only (color/size are the only variants), fixed "Budget" shipping method, no live shipping-rate comparison.
- **No automated test suite** — validated via manual/Playwright end-to-end runs, not CI-checked.
- `npm audit` flags a moderate/high advisory in a `postcss` version bundled *inside* Next.js's own toolchain (build-time only, not user-facing); fixing it requires Next 16, which I didn't jump to given the scope here.
- Shipping is currently allow-listed to ~22 countries in `lib/site.ts` (Stripe requires an explicit list); easy to extend.

### To go live for real
Swap `STRIPE_SECRET_KEY`/webhook for live Stripe keys, get a production Prodigi key and set `PRODIGI_API_URL=https://api.prodigi.com`, then redeploy (Vercel env var changes need a redeploy to take effect). Everything else — Checkout flow, artwork generation, order creation — is already live-ready code, just pointed at sandboxes.
