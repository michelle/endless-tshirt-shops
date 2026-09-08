/**
 * Creates a Prodigi *sandbox* order for a design using the deployed print asset,
 * exactly as fulfillment.ts does after a paid checkout. Nothing is printed or
 * charged in the sandbox.
 *
 *   NEXT_PUBLIC_SITE_URL=https://your-deployment.vercel.app \
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/prodigi-sandbox-order.ts
 */
import { createProdigiOrder, getProdigiOrder } from "../src/lib/prodigi";
import { printAssetUrl } from "../src/lib/fulfillment";
import { parseDesign } from "../src/lib/design";
import { PRODIGI_SKU, garmentByKey } from "../src/lib/catalog";

async function main() {
  const parsed = parseDesign({ name: "Amelia", date: "1994-06-12", climate: "alpine", dedication: "For Mum", variant: 1, garment: "natural" });
  if (!parsed.design) throw new Error(parsed.error);
  const design = parsed.design;
  const ref = `test-${Date.now()}`;
  const assetUrl = printAssetUrl(design);
  console.log("asset:", assetUrl);
  const head = await fetch(assetUrl, { method: "HEAD" });
  console.log("asset reachable:", head.status, head.headers.get("content-type"), head.headers.get("content-length"));

  const order = await createProdigiOrder({
    merchantReference: ref,
    idempotencyKey: ref,
    shippingMethod: "Standard",
    recipient: {
      name: "Test Customer",
      email: "test@example.com",
      address: { line1: "1 Test Street", townOrCity: "Springfield", stateOrCounty: "IL", postalOrZipCode: "62701", countryCode: "US" },
    },
    items: [
      {
        merchantReference: `${ref}-tee`,
        sku: PRODIGI_SKU,
        copies: 1,
        sizing: "fitPrintArea",
        attributes: { color: garmentByKey(design.garment)!.prodigi, size: "m" },
        assets: [{ printArea: "front", url: assetUrl }],
      },
    ],
    metadata: { test: "true" },
  });
  console.log("created:", order.id, order.status.stage, JSON.stringify(order.status.issues));
  await new Promise((r) => setTimeout(r, 4000));
  const again = await getProdigiOrder(order.id);
  console.log("status after 4s:", again?.status.stage, JSON.stringify(again?.status.details), JSON.stringify(again?.status.issues));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
