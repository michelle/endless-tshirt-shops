The store is fully deployed and verified. Both processes are detached (PPID 1) and will outlive this session.

---

# ✦ Midheaven — the build & deployment report

## What I built

**The concept: "Midheaven — custom night-sky tees."** Every shirt is printed with *the exact night sky above a moment the customer chooses* — date, local time, and any place on Earth (the gallery even includes *the night we walked on the Moon*, computed for Tranquility Base). Each order generates a single-copy print: ~800 stars plotted from the HYG catalog, all 88 constellations, the Moon with its **true phase**, and the naked-eye planets positioned by a real ephemeris. A concept that is only possible with DTG — no two shirts can ever be the same, because no two skies are.

- **Storefront** (Next.js 16): landing page with live-computed gallery, customiser with live recomputing preview (shirt mockup + full artwork), offline geocoder (70k GeoNames places, with timezones), facts strip ("brightest: Vega · moon 4% waxing crescent · Jupiter & Saturn visible")
- **Design engine** (isomorphic): same code renders the browser preview and the **4680×5790 px transparent PNG @ 300 dpi** print file (the exact recommended front print area for the Bella+Canvas 3001), rasterised with bundled Cinzel / DM Serif Display / IBM Plex Mono fonts
- **Payments**: Stripe Checkout (test mode), shipping address collected by Stripe
- **Fulfilment**: Prodigi Print API sandbox — `GLOBAL-TEE-BC-3001`, order submitted **only after** Stripe confirms `payment_status === paid`, via signature-verified webhook *and* a server-verified success page
- **Stateless by design**: the whole shirt is defined by a tiny spec that travels through Stripe metadata and a base64url design id — the print file URL regenerates deterministically from the id alone. **Idempotency** is Prodigi's `idempotencyKey` = Stripe session id, so no path can print a shirt twice.

## 🔭 The store is live at

# **https://excluding-picnic-boxing-requirements.trycloudflare.com**

(served by the production build on this Mac, published through a Cloudflare quick tunnel; also saved in `midheaven/STORE_URL.txt`)

## How to test it

1. **Browse**: the hero and gallery charts are computed live for real moments. Try `/create?sample=moon`.
2. **Create a design**: pick a title preset (or your own words), date, time, type a place (e.g. *Berlin*), add a dedication, choose colour/size. The preview recomputes the actual sky on every change.
3. **Pay**: Checkout → Stripe test page → card **`4242 4242 4242 4242`**, any future expiry, any CVC, any name/email + shipping address.
4. **Confirm**: you land on `/success` — it verifies the payment server-side, places the print order, and shows the real Prodigi order id + production stage. You can watch the order progress in the Prodigi sandbox dashboard (it reaches *InProduction* and allocates a lab + carrier within ~a minute).
5. **Inspect the print file** your shirt would print from: view the design id's URL (from the success page source or `node scripts/designid.mjs`) — `/api/print/<id>/file.png` is the exact 300 dpi file Prodigi downloads.

## What I verified end-to-end

| Check | Result |
|---|---|
| Star positions vs astronomy-engine (independent path) | ≤ 0.04° agreement; Polaris at observer latitude; Moon/planets correct for test nights |
| Prodigi order with exact production payload | `Created`, no issues (ord_1176940, navy/L) |
| Prodigi downloads artwork from the public URL | `downloadAssets: Complete` → `printReadyAssetsPrepared: Complete`, allocated to UK lab, Royal Mail |
| Duplicate submission | `AlreadyExists` — no second shirt |
| Unpaid session → success page / signed webhook | "Payment still settling", **no** Prodigi order |
| Real paid session (Sep 29 run) | found existing order by merchant reference, no duplicate |
| Forged webhook signature | rejected 400 |
| Print file via public URL | 4680×5790 RGBA, ~2 MB, ~1.2 s |

## Known gaps

1. **The hosted-card page itself is the one step I couldn't click myself** (no browser available to me in this session). Checkout sessions create and redirect correctly; completing the card form with `4242…` is standard Stripe and is your 30-second manual test above.
2. **Stripe webhook routing**: the sandbox's pre-registered webhook (`whsec_ckg0v…`, which my handler verifies) points at the **old** benchmark URL. Re-point it to `<store-url>/api/stripe/webhook` and it activates automatically; until then, the success page fulfils (idempotently) on its own.
3. **Deployment is a quick tunnel on this Mac** — publicly reachable, but the URL changes on restart and it lives only while this machine runs. That's why fulfilment is stateless: deploy anywhere in minutes (instructions below).
4. `phone_number_collection` is currently off (Prodigi accepts orders without phone); turn it back on for production.
5. Flat $39 / free world shipping; no taxes, no quotes-based regional shipping yet.
6. Design aesthetics were validated by structural pixel analysis (I can't view images this session) — give the preview and mockup an eyeball; typography/spacing tweaks are one-line changes in `lib/sky/svg.js`.
7. Star data (HYG via d3-celestial) and GeoNames need an attribution/licensing check before commercial sale (credited in the footer for now).

## Next steps to production

1. **Deploy properly**: the code is serverless-ready (no database, `serverExternalPackages` pre-set) — `vercel`/Fly/Render with env vars `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `PRODIGI_API_KEY`, then a domain. (Or keep self-hosting with a *named* Cloudflare tunnel for a stable URL.)
2. **Stripe**: live-mode key, register the webhook, enable phone collection + Stripe Tax, connect a bank account.
3. **Prodigi**: live key + `PRODIGI_BASE_URL=https://api.prodigi.com/v4.0`, an order pause window while you soft-launch, quotes API for real shipping costs, branded packing slips.
4. **Ops**: an order DB + admin view and emails (today the stateless spec + Stripe/Prodigi records are the only state), alerting on webhook failures (my handler 500s so Stripe retries), legal pages, and a care-instructions page.

**Everything lives in** `…/T/benchmark-workspace.xMeEoR/midheaven` (git-committed, `README.md` inside, `.env` with the test keys, `STORE_URL.txt`). Restart anytime with `npm start` there plus `cloudflared tunnel --url http://localhost:3000`.
