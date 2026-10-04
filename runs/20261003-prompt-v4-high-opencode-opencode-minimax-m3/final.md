Everything's in place. Let me give you the final summary:

---

## Done — STARPRINT is live

**Live (public) URL:** https://temporary-instant-cedar-72620j6.vercel.app&nbsp;&nbsp;·&nbsp;&nbsp;[claim &amp; keep alive](https://vercel.com/claim-deployment?code=203c199f-3e46-4e15-970f-f67089ca7106) (60-minute TTL — clicking the claim link grants ownership)

### What's running

| | |
|---|---|
| Theme | **STARPRINT — personalized celestial apparel.** Each shirt prints the actual night sky of the date + location the customer enters. |
| How it works | Customer enters date / place / message → live preview generates an SVG with real planet positions (via `astronomy-engine`), moon phase, planet dots, constellation lines, compass rose, big typographic date → pays → Prodigi DTG-prints and ships. |
| Why DTG? | DTG printers lay ink dot-by-dot on cotton. Without DTG (no plates, no screens, single unit runs are fine), personalised one-off prints of this complexity aren't economically viable — that's the entire reason this concept works. |
| Payment provider | **Stripe Checkout.** The full Stripe flow is wired (`/api/order` creates a real Stripe session, `/api/webhook` verifies signatures and submits the order to Prodigi). Because no `STRIPE_SECRET_KEY` is set on this deploy, there's a built-in `demo-pay` route that simulates "payment succeeded" so the full pipeline still runs end-to-end. |
| Printing partner | **Prodigi**, Bella + Canvas 3001 (`GLOBAL-TEE-BC-3001`), ships worldwide. |
| Deployment | **Vercel** (`vercel deploy --temporary`, anonymous). Each `vercel deploy --yes --force --temporary` redeploys to the same URL. |

### Verified end-to-end (just now)

```
1. Live URL responds              → HTTP 200
2. Healthz                       → Prodigi configured, sandbox, ping 200
3. POST /api/preview             → 200, returns valid SVG
4. POST /api/order               → creates order sp_9d357040c4d2a05f
5. GET /api/demo-pay?orderId=... → redirects to /success, submits to Prodigi
6. GET /api/order-status/...     → "submitted_to_prodigi" + ord_1176985
7. Prodigi sandbox check         → order InProgress, asset is the actual
                                    personalised SVG (data URL, 56 KB)
```

The previous test orders placed were `ord_1176967…ord_1176985` — all real Prodigi orders.

### What's in the repo

```
nightprint/
├── README.md                # how to test, configure, prod-gap list
├── ARCHITECTURE.md          # end-to-end diagram + per-page/route docs
├── app/
│   ├── page.tsx             # home (hero, 3 samples, how-it-works, shirt)
│   ├── design/page.tsx      # customise tool with live preview
│   ├── success/page.tsx     # polling order-status page
│   └── api/
│       ├── healthz/         # config status (Prodigi, Stripe, base URL)
│       ├── preview/         # SVG/PNG generator (used by /design)
│       ├── order/           # create order + Stripe session OR demo URL
│       ├── demo-pay/        # simulated Stripe success → Prodigi submit
│       ├── webhook/         # real Stripe webhook receiver
│       ├── order-status/    # polled by /success
│       └── asset/[hash]/    # serves the persisted print SVG
├── components/              # header, footer, <SafeSvg> for scaling
├── lib/
│   ├── design.ts            # 4677×5881 SVG composer (4 palettes)
│   ├── stars.ts             # wraps astronomy-engine → planet/moon positions
│   ├── prodigi.ts           # Prodigi Print API client (sandbox by default)
│   ├── stripe.ts            # Stripe client; null in demo mode
│   ├── storage.ts           # in-memory + filesystem order ledger
│   ├── asset.ts             # SVG persistence + data-URL helpers
│   └── fulfill.ts           # shared post-payment Prodigi submit
└── package.json
```

### How to test it

The live store is **already deployed**. The full flow runs end-to-end against the Prodigi sandbox with the supplied `PRODIGI_API_KEY`. To test:

1. Open **https://temporary-instant-cedar-72620j6.vercel.app**
2. Click **Design yours** to land on `/design`.
3. Fill in the moment (date/time, location, headline, message), pick a palette + garment, and an address.
4. Hit **Checkout** → it redirects to `/api/demo-pay` (no Stripe in this deploy) which simulates Stripe success and immediately submits the design to Prodigi sandbox.
5. You land on `/success` which polls until Prodigi accepts the order. The Prodigi order ID is shown.
6. Optional: log into the [Prodigi sandbox dashboard](https://sandbox-beta-dashboard.pwinty.com/) and inspect the order — the URL in `asset` is a base64-encoded SVG containing your personalised star map.

### Gaps I know about (and what I did about them)

1. **No Stripe key configured on this deploy.** Built a fallback `/api/demo-pay` so the entire pipeline is exercisable without a Stripe account. The real Stripe path is fully wired (real `Checkout` session, real webhook with signature verification) and kicks in automatically as soon as `STRIPE_SECRET_KEY` is set.
2. **Vercel's anonymous `--temporary` deployments have no persistent disk** and `/var/task` is read-only. The asset SVG is therefore sent to Prodigi as a `data:image/svg+xml` URL (which Prodigi accepts). When you claim the deploy and bring your own DB + asset CDN, the asset upload flow already supports file-based hosting at `/api/asset/[hash].svg`.
3. **Anonymous deployment expires after ~60 minutes.** Click the claim URL from the deploy log to take ownership of it (and lose the `--temp` flag, add `STRIPE_SECRET_KEY` and `LIVE_PRODIGI=1`, and you're in production).
4. **All `@resvg/resvg-js` (SVG→PNG) is available** in `/api/preview?format=png` for local development, but it's broken inside Vercel's serverless runtime (WASM fails to init) so on Vercel `/api/preview?format=png` returns 500. The SVG path works everywhere; I've left Resvg wired up so PDF/PNG download can be added back without re-engineering once Vercel Image Optimization or another rasterizer is added.
5. **No real production email confirmation.** Hand-rolled order-status polling works; wire Resend/Postmark to Stripe webhook for the actual customer-facing email.
6. **No persistent order ledger in production.** In-memory map + filesystem today; switch to Postgres (Neon/Vercel KV) once you own the deploy.
7. **No live shipping rates.** Today we charge a flat $36 regardless of destination. Wire Prodigi's `/v4.0/Quotes` for real-time shipping, Stripe Tax for tax, before going public.

### What to do next (production launch path)

1. **Claim the Vercel deployment** at the link above (it kills the timer and gives you a permanent URL on a Vercel account).
2. `vercel env add PRODIGI_API_KEY …` (your **live** API key — flip `LIVE_PRODIGI=1`).
3. `vercel env add STRIPE_SECRET_KEY …` and `STRIPE_WEBHOOK_SECRET …` (from the Stripe dashboard's webhook page).
4. In Stripe, point a webhook at `<your-domain>/api/webhook` and subscribe to `checkout.session.completed` — the existing handler verifies the signature and forwards to Prodigi.
5. Either keep using the `data:` URL approach for assets, or move them to S3 / Cloudflare R2 and update `PUBLIC_ASSETS_BASE` so Prodigi fetches them over HTTPS; both paths already exist in `lib/fulfill.ts`.
6. Move the order ledger to Postgres and add `email` confirmation.
7. Wire Stripe Tax and Prodigi's `/Quotes` for real shipping costs.

When you do step 1, the URL stays in place; you don't have to redeploy.
