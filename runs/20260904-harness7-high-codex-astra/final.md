Deployed: **[Open the datetime.store sandbox](https://benchmark-20260904-harness7-high-co-amber.vercel.app)**

1. **What I built:** A polished, responsive storefront with live timestamp previews, two fits, sizing, capture-and-review, Stripe checkout, generated print artwork, Prodigi fulfillment, and private order tracking. It uses the new project `benchmark-20260904-harness7-high-codex-astra`.

2. **Verification:** Completed a $36 Stripe test purchase. Its webhook created Prodigi order `ord_1170396`; Prodigi downloaded and prepared the artwork successfully. Duplicate submissions preserved the same order. Mobile checks, five tests, production build, and dependency audit passed. To try it, use card **4242 4242 4242 4242**, a future expiry, any CVC, and fictional US shipping details. Locally: `npm ci`, then `npm run dev`.

3. **Before real customers:** Claim the Stripe sandbox **before September 12, 2026**, configure live accounts and webhooks, approve physical samples, finalize taxes/pricing, publish support and shop policies, and add monitoring. Exact instructions are in the [operations guide](/var/folders/mq/v8s9bp2x5gg6gvywwjfszb8r0000gn/T/benchmark-workspace.1eIjTp/docs/OPERATIONS.md).

4. **Limitations:** Sandbox only; US shipping, black tees, S–XL, one shirt per checkout. No automated refunds, customer emails, or operator dashboard. **Stripe Projects initialization remains blocked by account sign-in**; its CLI was used, but provisioning could not be completed.

5. **Decisions:** Preserved the original live-timestamp experience, added explicit capture review, used hosted Stripe checkout to isolate card handling, and made Prodigi submissions duplicate-safe.

6. **Friction:** Resolved Vercel framework/alias configuration, unavailable connected-browser tooling, and dependency advisories. The separate Stripe Projects authorization remains the outstanding human step.