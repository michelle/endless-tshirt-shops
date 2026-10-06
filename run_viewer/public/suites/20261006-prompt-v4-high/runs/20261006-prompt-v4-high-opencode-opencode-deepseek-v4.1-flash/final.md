Done. Here's the complete picture.

## What I built

**Echoform** — a made-to-order store that turns a phrase into a **one-of-one "soundprint."** The customer types any phrase; I deterministically compose a unique audio waveform from those exact words and print it, with the phrase set beneath it. Because it's DTG (single-unit, full-colour, no setup cost), every shirt can be genuinely unique — which is the whole point of the concept.

- **Live store:** https://two-ted-lace-reaction.trycloudflare.com
- **Admin:** `/admin?key=echoform-admin-cd96bcb0`
- Stack: Node/Express + `@napi-rs/canvas` (artwork + mockups), Stripe Checkout, Prodigi Print API, JSON order store.
- The design is generated at **4680×5790 px, transparent PNG** (matches Prodigi's `GLOBAL-TEE-BC-3001` front print area) and uses `fitPrintArea` so it never crops.

## How to test it

1. Open the store, scroll to **The studio**.
2. Type a phrase, optionally a dedication, pick an ink theme, garment colour, size, and hit **Shuffle pattern** to see the waveform change per phrase.
3. Click **Buy now** → Stripe-hosted Checkout.
4. Pay with the Stripe test card **`4242 4242 4242 4242`**, any future expiry, any CVC, any ZIP. Fill the shipping address + phone.
5. You'll land on a confirmation page showing `Payment: paid` and the **Prodigi order id**.
6. Inspect orders at the admin URL above.

I already ran two fully automatic end-to-end purchases (headless Chrome paying a real test session). Both produced valid Prodigi sandbox orders — `ord_1178029` and `ord_1178043` — where Prodigi successfully downloaded our print asset (`downloadAssets: Complete`, item status `Ok`). I also verified that an **unpaid** session creates **no** Prodigi order.

## Payment gating (the key requirement)

`/api/checkout` creates a Stripe Checkout Session. Prodigi is called from `fulfillFromSession()` **only** after Stripe reports `payment_status = paid`. Fulfilment is triggered by two independent paths — the success redirect and a signed `checkout.session.completed` webhook — made safe by an in-process lock plus Prodigi idempotency keys, so a shirt can never be printed twice. Webhook signature verification is tested (valid → 200, tampered → 400).

## Known gaps

- **Payments are test-mode.** The provided Stripe key is an *unclaimed restricted sandbox* (Checkout + webhooks work; balance/account endpoints don't). No real money moves.
- **The deployment is a Cloudflare quick tunnel** — publicly reachable, but ephemeral: it dies when the machine/session stops, and the URL changes on restart, which would invalidate the Stripe webhook and any in-flight print-asset URLs. Prodigi downloads the asset immediately, so orders already placed are fine.
- **No transactional email** (customer receipt or Prodigi tracking), **no tax/shipping calculation** (flat $34 including shipping), **no refunds/returns flow**, and orders live in `data/orders.json` rather than a database.
- The soundprint is a **deterministic generative waveform of the words**, not a recording of actual audio — the site describes it that way honestly.
- Content/legal pages are minimal.

## To take it to production

1. Claim the Stripe sandbox or create your own account, then swap in live keys and point the webhook at a stable domain.
2. Switch `PRODIGI_API_KEY`/`PRODIGI_BASE` to live Prodigi.
3. Host on a real service (Render/Railway/Fly/VPS, or a named Cloudflare tunnel) with a fixed `PUBLIC_URL`.
4. Move orders to a database, add Stripe Tax + live shipping rates, customer/tracking emails, and a refunds workflow.
5. Add rate limiting and a TTL on the signed print URLs.

The code, `README.md`, `.env.example`, and a `scripts/deploy.sh` one-command deploy are all in the workspace.
