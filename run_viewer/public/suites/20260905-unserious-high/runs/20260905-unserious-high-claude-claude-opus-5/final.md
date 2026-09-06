Built, deployed, and verified end to end with a real purchase.

## Live

**https://benchmark-20260905-unserious-high-c-tan.vercel.app**

Vercel project `benchmark-20260905-unserious-high-claude-claude-opus-5` (team: Michelle's projects).

## How to test it

1. Open the site. The shirt ticks live at 60fps — that's the actual print design, not a mockup.
2. Pick a fit, colour and size. Ink flips automatically (white on dark garments, black on light).
3. Click **Buy this exact moment** → Stripe Checkout.
4. Select **Card**, then pay with `4242 4242 4242 4242`, any future expiry, any CVC, any address.
5. You land on a receipt showing your frozen millisecond, the Prodigi order id, and a link to the actual print PNG.

I ran this exact flow: session `cs_test_a1NnEE…`, which produced Prodigi order **`ord_1170598`** — SKU `GLOBAL-TEE-GIL-64000`, attributes `navy blue`/`l`, asset on the `front` print area, no issues. The webhook delivered cleanly (`pending_webhooks: 0`), and reloading the receipt three times still yielded exactly one print order.

## What you need to do

**Claim the Stripe sandbox within 7 days — it expires 2026-09-13 and the store dies with it:**
https://dashboard.stripe.com/onboard_sandbox/YWNjdF8xVUNYRFlJbWtId1A4RjRMLDE3ODkyNzczMDcv100eY7t7cnz

`stripe sandbox create` failed its first attempt and fell back to a browser device flow I couldn't complete non-interactively; a retry provisioned it automatically. The key is a restricted sandbox key (`rkcs_test_`) — fine for Checkout, webhooks and PaymentIntent updates, but it can't reach some endpoints (e.g. `/v1/balance`). Swap in a full key if that bites.

I also **disabled Vercel Deployment Protection** on the project. That was required, not incidental: Prodigi fetches the artwork over the public internet, so an SSO-gated URL breaks fulfillment outright.

## Notable design decisions

Prodigi pulls artwork from a **URL** rather than accepting an upload the way Scalable Press did, so the print file is generated on demand at `/api/art/{ink}/{timestamp}.png` — deterministic, immutably cached, reproducible forever from the timestamp alone.

Digits are seven-segment vector polygons in `lib/glyphs.ts`, shared by the browser preview and the server renderer, so the preview is genuinely WYSIWYG. `lib/png.ts` is a dependency-free scanline rasteriser and PNG encoder (~150ms, 40KB output) — no `sharp`/`resvg`/`node-canvas`, since the artwork is a few dozen convex polygons and a native image library would only add build fragility.

Two bugs I caught in visual QA and fixed: the garment silhouette was drawn at a 1.79 body aspect (read as a tunic) versus the real 1.24, and the preview's print-area rectangle was sized so that the on-screen print misrepresented an 11.7″ print as 8″. Both now match the Gildan 64000's real geometry.

## Gaps

- **Print resolution is ~236 DPI, not Prodigi's recommended 300.** The canvas is 3300px scaled to fill a 13.98″ area. Deliberate, to keep the serverless render fast and inside memory; raise `CANVAS_W` to 4194 in `lib/print-layout.ts` for true 300 DPI at the cost of render time.
- **No database.** Idempotency rides on PaymentIntent metadata plus Prodigi's `idempotencyKey`. Prodigi's list endpoint silently ignores its `merchantReference` filter, so it isn't usable as a third check. A genuinely concurrent double-submit where the metadata write also fails could theoretically duplicate — low risk, but real.
- **Order status stops at purchase.** I don't handle Prodigi's callback webhook, so the receipt shows the order id but never updates to shipped/tracking.
- **No rate limiting** on `/api/checkout` or `/api/art`. The art route does real CPU work; edge caching absorbs repeats but not novel timestamps.
- **Sandbox only** — no shirt physically prints or ships. Only US shipping was exercised, though 23 countries are enabled.
- The Prodigi sandbox account is **shared across benchmark runs** — I can see other runs' orders in it, so don't read the order list as yours alone.
- Two buyers in the same millisecond genuinely get the same design. The FAQ jokes about it; it remains true.

Local keys are in `.env.local` (gitignored). `README.md` documents the architecture and the Scalable Press → Prodigi migration.
