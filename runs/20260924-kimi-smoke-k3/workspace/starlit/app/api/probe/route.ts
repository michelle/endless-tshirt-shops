// Temporary serverless diagnostics (remove before production).
// Reports health via Prodigi order merchantReference strings, which are
// visible in the Prodigi order list from outside the Vercel network.

import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import path from "path";

export const runtime = "nodejs";
export const maxDuration = 60;

function sanitize(s: string, max = 120): string {
  return s.replace(/[^a-zA-Z0-9.,:;+_= -]/g, "~").slice(0, max);
}

async function report(ref: string, appUrl: string): Promise<void> {
  try {
    await fetch(`${process.env.PRODIGI_BASE_URL}/Orders`, {
      method: "POST",
      headers: {
        "X-API-Key": process.env.PRODIGI_API_KEY!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        merchantReference: sanitize(ref, 200),
        shippingMethod: "Standard",
        recipient: {
          name: "Diag",
          address: {
            line1: "1 Test Way",
            postalOrZipCode: "10001",
            countryCode: "US",
            townOrCity: "NYC",
          },
        },
        items: [
          {
            sku: "GLOBAL-TEE-BC-3001",
            copies: 1,
            sizing: "fillPrintArea",
            attributes: { color: "black", size: "m" },
            assets: [{ printArea: "front", url: `${appUrl}/sample.png` }],
          },
        ],
      }),
    });
  } catch {
    // diagnostics only
  }
}

export async function GET() {
  const appUrl = process.env.APP_URL ?? "https://benchmark-20260924-kimi-smoke-k3.vercel.app";
  await report(
    `d1 node=${process.version} secret=${process.env.ORDER_SECRET ? 1 : 0} key=${process.env.PRODIGI_API_KEY ? 1 : 0} url=${process.env.APP_URL ?? "unset"}`,
    appUrl
  );

  try {
    const { pathTextRenderer } = await import("@/lib/textpath");
    const d = pathTextRenderer({
      text: "Test",
      x: 0,
      y: 10,
      size: 10,
      anchor: "start",
      tracking: 0,
      fill: "#000",
    });
    await report(`d2 font=${d.includes("NaN") ? "NaN" : "ok"}`, appUrl);
  } catch (e) {
    await report(`d2 fontError=${String(e)}`, appUrl);
  }

  try {
    const { Resvg } = await import("@resvg/resvg-js");
    const png = new Resvg(
      '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" fill="#fff"/></svg>'
    )
      .render()
      .asPng();
    await report(`d3 resvg=ok bytes=${png.length}`, appUrl);
  } catch (e) {
    await report(`d3 resvgError=${String(e)}`, appUrl);
  }

  try {
    const { buildStarMapSVG } = await import("@/lib/starmap");
    const { pathTextRenderer } = await import("@/lib/textpath");
    const svg = buildStarMapSVG(
      {
        lat: 48.8566,
        lng: 2.3522,
        date: "2019-06-14",
        time: "22:30",
        place: "Paris, France",
        title: "Diag",
        theme: "dark",
      },
      pathTextRenderer
    );
    await report(`d4 svg=${svg.includes("NaN") ? "NaN" : "ok"} len=${svg.length}`, appUrl);
  } catch (e) {
    await report(`d4 svgError=${String(e)}`, appUrl);
  }

  let png: Buffer;
  try {
    png = readFileSync(path.join(process.cwd(), "public", "sample.png"));
  } catch {
    png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      "base64"
    );
  }
  return new NextResponse(new Uint8Array(png), {
    headers: { "Content-Type": "image/png" },
  });
}
