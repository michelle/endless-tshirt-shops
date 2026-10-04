The store is built, deployed, and verified end to end with a real test payment that produced a Prodigi sandbox order.

**Live store:** https://temporary-swift-squall-16gsq00.vercel.app
Source is in `orbitday/` in your workspace, with a README covering architecture, testing, gaps and the production checklist.

**Urgent: claim two things before they expire**
- Vercel deployment expires at 07:08 UTC today (about 55 minutes after this message). Claim it here: https://vercel.com/claim-deployment?code=166f8cf7-a73d-4f64-91f4-5c2f0745974f
- Stripe sandbox expires 2026-10-11. Claim it here: https://dashboard.stripe.com/onboard_sandbox/YWNjdF8xVU1JYVBCUUpadEx6TWxiLDE3OTE2OTcyNDQv100DyOxTe1h

**The concept: Orbitday.** The customer enters a date (birthday, wedding, the day they met). The site computes the heliocentric position of all eight planets on that day from JPL orbital elements, plus the moon phase, and lays it out with their caption. No two shirts are alike, which is exactly what DTG makes cheap. Every line is at least 1.2 mm and every dot at least 2.4 mm, solid ink only, white on dark shirts and charcoal on light ones. One SVG renderer drives both the browser preview and the print file, so what they see is what the lab gets.

**How to test**
1. Open the live URL, click Design yours, change the date and caption. Switch to the Print file tab to see the exact artwork.
2. Checkout. On Stripe's page use card 4242 4242 4242 4242 with any future expiry, CVC and address.
3. The thank-you page shows the payment, the Prodigi order id, and the lab's progress.
4. Check `GET /api/health` for a self-test, or run the headless-Chrome script in `scripts/pay-test-checkout.js` to pay a session automatically.

**What I verified**
- Payment on the live site created Prodigi order `ord_1176885` with the correct address, SKU, colour, size and a publicly reachable asset URL.
- The print asset served from the live site is 4680×5790 px at 300 DPI, matching the Bella+Canvas 3001 front print area.
- The Stripe webhook accepts correctly signed events and rejects bad signatures. The webhook and the thank-you page raced on the test order and produced exactly one Prodigi order, thanks to idempotency keys.

**Known gaps**
- Prodigi sandbox orders never progress past "InProgress" and never download artwork, so the later status steps only move with a live key.
- Shipping is a flat $5.95 worldwide and tax is not collected. Real Prodigi shipping varies by country.
- No shipping-confirmation email yet, no admin page, no rate limiting on the render endpoint.
- Vercel function logs were unavailable without a login, so I added the health route for diagnostics instead.

**To bring it to production**
1. Claim the Vercel deployment, attach a domain, and set `SITE_URL`.
2. Activate a live Stripe account, create a live webhook endpoint for the domain, and swap the keys.
3. Get a live Prodigi key, switch the API base to production, and order one sample per colour to check ink and placement.
4. Decide pricing and country-specific shipping. Current cost is about $12 per tee plus $3 to $8 shipping against a $36 price.
5. Add Prodigi order callbacks for tracking emails, plus policies and a statement descriptor.

The full checklist with details is in the README.
