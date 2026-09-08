Live: **https://benchmark-20260907-prompt-v3-high-c-pearl.vercel.app**

## What I built

**Cryptidæ** — "Everyone is haunted by something. We draw yours."

You answer five questions (your name, where it turns up, the hour it stirs, what it feeds on, its temperament). A generative illustrator turns those answers into a creature and sets it inside a full 19th-century naturalist's plate: a Latin binomial derived from *your* name (`Saxumbra michaelorum`), field notes written from your answers, a height bracket measured against a 1.75 m human, danger pips, a specimen number, and your name in the credits. Then it's printed once, direct-to-garment.

The concept is DTG-native on purpose: full-colour, fine-line, edge-to-edge artwork at a run of exactly one. Six creature archetypes × horns/eyes/wings/tails/markings × 8 palettes, all seeded off your exact answers — change one character and the anatomy changes. There's a "not quite it — summon again" re-roll, and the ink flips between bone and coal so the plate reads on whichever of 8 garment colours you pick.

**Payment: Stripe Checkout.** Prodigi is only ever called from a path that first re-reads the session from Stripe and refuses to act unless `payment_status === "paid"`.

## How to test it

1. Open the site, fill in the five questions, watch the plate build live. Toggle "the plate, up close" and try a few garment colours.
2. Hit **Print this creature** → Stripe Checkout. Card `4242 4242 4242 4242`, any future expiry, any CVC, any US address.
3. You land on `/order/<session_id>` — payment state, Prodigi order id, and a live production timeline (artwork received → print file prepared → assigned to a lab → on the press → shipped) pulled from Prodigi on every load.
4. `node scripts/e2e.mjs <url>` does all of the above automatically in a real browser.

I ran the full loop twice against production. Prodigi orders `ord_1171010` and `ord_1171012` were created, **Prodigi downloaded the 4680×5790 print file from the live URL** (`downloadAssets: Complete`, md5 verified), the file passed their print-ready check with zero issues, a lab was allocated, and both went to `inProduction`.

Also verified: an unpaid session produces no Prodigi order; unsigned and bad-signature webhooks get 400; reloading the order page does not create a second order (exactly one Prodigi order per session).

## Architecture worth knowing

The artwork is a pure function of the answers, so the preview the customer approves *is* the file the press receives — no separate render that could drift. Nothing is stored: the design is encoded into the Stripe session metadata and into a permanently cacheable print-file URL. No database to keep in sync. Retried webhooks can't double-print because Prodigi's `idempotencyKey` is the Stripe session id.

Unit economics check out — landed cost is $16.93 (US) to $21.87 (GB) against $48 retail, so free worldwide shipping is genuinely funded.

## Gaps you should know about

**Blocking for production:**
- **Everything is sandbox.** Prodigi sandbox never actually prints. Swap `PRODIGI_API_BASE` to `https://api.prodigi.com/v4.0` + a live key, and Stripe to live keys.
- **The Stripe account is an unclaimed sandbox that expires 2026-09-15.** Claim it: https://dashboard.stripe.com/onboard_sandbox/YWNjdF8xVURGQWdESVJGZDN6bXJQLDE3ODk0NDY2NjIv100ZNthv2QW (`acct_1UDFAgDIRFd3zmrP`). The key is restricted — it can't read `/v1/account`, which is fine for this app but will bite you elsewhere.
- **No tax.** `automatic_tax` is off. Prodigi's own quote warns US sales tax may apply. Turn on Stripe Tax and register where you have nexus.
- **No physical print test.** The art is sRGB and I've only validated it digitally. DTG shifts colour, and my palettes lean saturated. Order samples on black, cream and army before selling.
- **No legal pages** — terms, privacy, returns policy. The FAQ makes a returns promise nothing backs up yet.

**Should fix soon:**
- **`/api/art` is an unauthenticated CPU-heavy endpoint** (~0.4–2 s, ~300 MB per render, arbitrary token). Cache hits are free but an attacker can vary the token forever. Sign the token with an HMAC, or rate-limit it. This is the one I'd do first.
- **No email beyond Stripe's receipt.** Nobody is told when their shirt ships. Register a Prodigi `callbackUrl` and wire an email provider.
- **No order lookup** — customers need the exact `/order/<session_id>` URL. No accounts, no lookup-by-email, no admin view.
- **No refund or cancellation flow.** Prodigi allows cancellation before production; there's no UI for it.
- **No tests.** There's an E2E script and two dev render scripts, but no unit tests around the encode/decode round-trip or fulfilment guards — and that round-trip is load-bearing for reproducing print files.

**Smaller:**
- Free-text answers go straight onto a printed garment with no moderation. Length is capped and HTML is stripped, but someone can print something offensive and you'll ship it.
- Stripe metadata caps values at 500 chars, which is what bounds the input lengths — a richer design spec needs a real datastore.
- Only Prodigi "Budget" shipping; no expedited option (Express costs $31 to the US and would need separate pricing).
- `POST /api/checkout` with an empty body creates a valid session with default answers. Harmless, but the UI's five-answer gate isn't enforced server-side.
