Deployed: **[AFTER HOURS](https://benchmark-20260911-prompt-v3-high-c.vercel.app)** — personalized tour tees featuring customers’ memories, places, dates, colors, and unique generative artwork.

**Verified:** a successful Stripe sandbox payment automatically created Prodigi order `ord_1171654`. Replaying the webhook kept the same order. Unpaid orders never reached printing. All 12 automated tests passed.

To test:

1. Customize a shirt, select your size, and approve the preview.
2. Check out using **4242 4242 4242 4242**, any future expiry, and any three-digit CVC.
3. Enter a US shipping address and follow the confirmation page.

**This is sandbox mode:** no real money moves and no shirts ship.

**Next:** [Claim your Stripe sandbox before September 18](https://dashboard.stripe.com/onboard_sandbox/YWNjdF8xVUVUTEU3VWR1UGZVdktuLDE3ODk3NDc5MzQv100VSO9XOZA). For production, activate Stripe and Prodigi billing, configure live credentials/webhooks and taxes, add your support address, finalize policies, and approve a physical sample.

Known limits: US shipping only, one design/size per checkout, manual refunds/cancellations, and no transactional email integration. Browser interaction testing and physical print quality remain unverified; Prodigi accepted the order but production was still pending.

Full setup, testing evidence, and launch checklist: [README](</var/folders/mq/v8s9bp2x5gg6gvywwjfszb8r0000gn/T/benchmark-workspace.dvfOBs/README.md>).