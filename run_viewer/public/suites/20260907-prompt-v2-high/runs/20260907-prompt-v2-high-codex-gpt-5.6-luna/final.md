Built and deployed: [Moonmoth Supply Co.](https://benchmark-20260907-prompt-v2-high-codex-gpt-56-luna-lvfynlvgr.vercel.app)

Theme: nocturnal fieldwear for night owls, with three original moth/moon designs.

Test it:

1. Open the link and select a shirt.
2. Choose a size and add it to the bag.
3. Continue to checkout.
4. Use sample details such as `qa@example.com`, `14 Test Place`, `Somewhere`, `CA`, `94107`, United States.
5. Click “Place sandbox order.”

I verified a real Prodigi sandbox submission: `ord_1170876`. Prodigi sandbox orders are not charged or fulfilled. [Prodigi API docs](https://www.prodigi.com/print-api/docs/reference/)

Known gaps:

- No payment processor is connected; checkout is sandbox-only.
- No database, customer accounts, order-history, or fulfillment webhook handling.
- Shipping, tax, returns, and inventory rules are still basic.
- Production requires a live Prodigi key, payment provider, legal pages, domain, analytics, and monitoring.

Next steps: connect Stripe or another payment provider, persist paid orders, switch to the live Prodigi API/key, add webhook-based status tracking, then configure shipping/tax/returns and a custom domain.