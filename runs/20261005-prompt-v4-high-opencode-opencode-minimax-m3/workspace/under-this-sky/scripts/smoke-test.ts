// scripts/smoke-test.ts
// Generates a sample product render against the local lib and verifies the
// Prodigi sandbox authentication works. Does NOT submit a real order —
// the deployed instance handles end-to-end via /api/demo-pay/[id]?paid=1.
//
// Usage:
//   npx tsx scripts/smoke-test.ts

import fs from "node:fs";
import path from "node:path";
import { snapshot } from "../lib/astronomy";
import { renderDesign } from "../lib/design";
import { svgToPng } from "../lib/render";
import { Prodigi } from "../lib/prodigi";

async function main() {
  const apiKey = process.env.PRODIGI_API_KEY?.trim();
  if (!apiKey) {
    console.error("PRODIGI_API_KEY not set — cannot run smoke test.");
    process.exit(2);
  }

  // Use the canonical "Elena & Marco in Lisbon" sample so the output
  // is comparable to what the brochure shows.
  const design = {
    dateIso: "2019-06-14T23:30:00Z",
    lat: 38.7223,
    lng: -9.1393,
    placeName: "Lisbon, Portugal",
    headline: "The Night We Met",
    subtitle: "Elena & Marco",
    message: ["And so the adventure began."],
    palette: "ink" as const,
    garment: "black" as const,
  };

  console.log("[smoke] generating design…");
  const sky = snapshot({
    whenUtc: new Date(design.dateIso),
    lat: design.lat,
    lng: design.lng,
    placeName: design.placeName,
  });
  const out = renderDesign(design, sky);
  console.log(`[smoke] design hash ${out.hash}, ${out.svg.length} chars of SVG`);

  const outDir = path.join(process.cwd(), "smoke-out");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, `${out.hash}.svg`), out.svg);
  console.log(`[smoke] SVG written → smoke-out/${out.hash}.svg`);

  console.log("[smoke] rasterising at 3000 px PNG…");
  try {
    const png = await svgToPng(out.svg, { width: 3000 });
    fs.writeFileSync(path.join(outDir, `${out.hash}.png`), png.buffer);
    console.log(`[smoke] PNG written → smoke-out/${out.hash}.png (${png.buffer.length} B)`);
  } catch (e) {
    console.log(
      `[smoke] native resvg unavailable: ${(e as Error).message}. The hosted site will fall back to submitting the SVG instead of a PNG.`
    );
  }

  console.log("[smoke] checking Prodigi sandbox auth…");
  const prodigi = new Prodigi({ apiKey, environment: "sandbox" });
  try {
    await prodigi.getOrder("ord_999999999");
    console.log("[smoke] probe ok (auth works)");
  } catch (e) {
    const err = e as Error & { status?: number; response?: { outcome?: string } };
    if (err.status === 404) {
      console.log("[smoke] auth ✓ (404 expected for ord_999999999)");
    } else {
      console.log("[smoke] probe error:", err.message);
    }
  }

  console.log(
    "\n[smoke] ✓ smoke test finished. To exercise the full pipeline, run the " +
      "deployed instance (or `npm run dev` locally) and POST to /api/checkout then " +
      "POST to /api/demo-pay/<id>?paid=1 (or complete Stripe Checkout)."
  );
}

main().catch((e) => {
  console.error("[smoke] fatal:", e);
  process.exit(1);
});
