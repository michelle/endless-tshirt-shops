Everything is verified and cleaned up. Here's the complete picture:

---

## 🎽 ONE OF ONE STUDIO — shipped and verified

**Live store:** https://benchmark-20260928-rep2-high-openco-seven.vercel.app

### The concept
DTG's superpower is that no two shirts need to be the same — so the whole store is built on that: **you type a word that means something to you (a name, a place, a promise), and a seeded generative engine grows it into a flowing flow-field artwork that has never existed before.** It's printed on exactly one shirt on Earth, with its edition hash. Same word + palette = same art forever; any other word grows a different piece. The browser preview *is* the print file (isomorphic JS art engine — client renders SVG, server rasterizes the identical SVG to a 3120×3860 transparent PNG via `sharp`).

### Stack & flow
- **Next.js 15** on Vercel (project `benchmark-20260928-rep2-high-opencode-opencode-kimi-k3-retry`, deployment protection disabled)
- **Stripe Checkout** (provisioned a claimable sandbox via `stripe sandbox create`) — collects payment, shipping address, phone
- **Prodigi** (`GLOBAL-TEE-BC-3001`, Bella+Canvas 3001, front print, XS–4XL, 11 colors, $36 incl. shipping; my cost ~$16.54)
- Paid session → signed webhook `checkout.session.completed` → `fulfillSession()` creates the Prodigi order with an HMAC-signed art URL. The `/success` page runs the same function as a fallback; both paths are idempotent (`merchantReference` check + Prodigi `idempotencyKey`).

### Verified end-to-end (not just claimed)
- ✅ Real test-card purchases (Playwright-driven) → Prodigi orders `ord_1175163`, `ord_1175166`, `ord_1175167`, asset download `Complete`
- ✅ Unpaid session → no Prodigi order; bad webhook signature → 400; unsigned art URL → 403
- ✅ Byte-identical art generated locally vs. on Vercel; print render ~0.4s

### How to test it
1. Open the site → **Create yours** → type a word, pick palette/color/size → **Buy this 1/1**
2. Pay with `4242 4242 4242 4242`, any future date, any CVC, any address in a listed country
3. Watch the success page show the lab order, then track at `/order/<session_id>`
4. Scripted: `HEADED=1 node scripts/e2e-payment.mjs`

### Known gaps
- Both payment and printing are **sandboxes** — nothing physical ships, no real charges
- **No database** by design: order state lives in Stripe metadata + Prodigi lookups. No order persistence, no confirmation/tracking emails of our own, no refund/cancel UI
- Card-only checkout (disabling Link/wallets avoids OTP modals in the sandbox), no sales-tax collection, flat pricing
- Art is regenerated on demand rather than stored — fine at this scale (CDN-cached), but production should persist the print file
- Stripe sandbox expires **2026-10-06** unless claimed

### To production
1. Claim the sandbox (`stripe sandbox claim` or the claim URL) or use a real Stripe account; swap to live keys + register a live webhook
2. Prodigi live API key + `PRODIGI_BASE_URL=https://api.prodigi.com`
3. Add a DB (order records, fulfillment status), transactional email, Stripe Tax, and a refund flow; optionally store print PNGs in blob storage at order time
