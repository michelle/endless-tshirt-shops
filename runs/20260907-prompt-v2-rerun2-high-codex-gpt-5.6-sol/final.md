The store is live:

**[Elsewhere Supply Co.](https://benchmark-20260907-prompt-v2-rerun2-rho.vercel.app)**

It includes three original “souvenirs from places that don’t exist,” responsive product selection, sizing, persistent cart, quantity controls, shipping form, and Prodigi sandbox fulfillment.

### How to test

1. Open the store and choose a shirt.
2. Select a size and add it to the bag.
3. Continue to sandbox checkout.
4. Enter a realistic test address and submit.

No payment or shipment occurs. I verified the deployed flow with Prodigi order `ord_1170943`; its artwork downloaded successfully and the item validated without issues.

### Known production gaps

- Checkout does not collect payment, tax, or handle fraud.
- Fulfillment uses Prodigi’s sandbox, which never prints or charges. [Prodigi environment documentation](https://www.prodigi.com/print-api/docs/reference/)
- Prices and shipping are currently fixed rather than calculated through Prodigi’s quote endpoint.
- The generated print files are suitable for testing but only 1024×1536; production artwork should be recreated at the garment’s recommended 3307×4606 resolution.
- Order persistence, confirmation emails, fulfillment webhooks, returns/privacy pages, and broader address validation remain to be added.

### Before taking real orders

Connect Stripe or another payment provider, replace the sandbox key with a live Prodigi key, switch the API hostname to `api.prodigi.com`, upload final print-resolution artwork, order physical samples, and add legal/customer-support policies.

The original assets were generated with the built-in ImageGen workflow:

- [Collection mockup](</var/folders/mq/v8s9bp2x5gg6gvywwjfszb8r0000gn/T/benchmark-workspace.XRVEkO/public/product/collection.png>)
- [Moon Orchard artwork](</var/folders/mq/v8s9bp2x5gg6gvywwjfszb8r0000gn/T/benchmark-workspace.XRVEkO/public/art/moon-orchard.png>)
- [Cloud Library artwork](</var/folders/mq/v8s9bp2x5gg6gvywwjfszb8r0000gn/T/benchmark-workspace.XRVEkO/public/art/cloud-library.png>)
- [Night Swimming artwork](</var/folders/mq/v8s9bp2x5gg6gvywwjfszb8r0000gn/T/benchmark-workspace.XRVEkO/public/art/night-swimming.png>)

Prompt briefs: a peach botanical crescent moon, cobalt books dissolving into a cloud, and an electric-cyan moonlit pool—each as transparent vintage screen-print artwork.