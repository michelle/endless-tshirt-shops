// app/api/demo-pay/[id]/route.ts
// Sandbox-friendly "Stripe-style" payment page that, when POSTed with
// `paid=1`, immediately fires the same fulfillment pipeline the
// Stripe webhook would. Used when the site is in `mode: 'demo'` (no
// Stripe key configured) or for any non-Stripe smoke test.

import { NextRequest, NextResponse } from "next/server";
import { fulfillOrder } from "@/lib/fulfill";
import {
  getAppBaseUrl,
  getProdigi,
  getStorage,
} from "@/lib/services";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const storage = getStorage();
  const order = await storage.readOrder(params.id);
  if (!order) {
    // Render an error HTML page so failed demos don't show blank panels.
    return html(
      404,
      `<h1>Demo session not found</h1><p>Try creating a new order from the design page.</p>`
    );
  }
  return html(
    200,
    `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>Demo pay — Under This Sky</title>
        <style>
          :root {
            --ink: #0a1830;
            --ink-deep: #040a18;
            --gold: #d9b67a;
            --parchment: #f4ecd8;
          }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            background: radial-gradient(ellipse at top, #0a1830 0%, #040a18 70%);
            color: var(--parchment);
            font-family: Cormorant Garamond, serif;
            padding: 60px 20px;
          }
          .card {
            max-width: 480px; margin: 40px auto; padding: 36px;
            border: 1px solid rgba(217, 182, 122, 0.35); border-radius: 18px;
            background: rgba(10, 24, 48, 0.6);
          }
          h1 { font-style: italic; font-weight: 500; line-height: 1.05; font-size: 28px; margin: 0 0 12px; }
          p  { color: rgba(244, 236, 216, 0.85); line-height: 1.55; }
          .row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid rgba(217, 182, 122, 0.15); }
          .row:last-of-type { border-bottom: 0; }
          .row span:first-child { color: rgba(217, 182, 122, 0.85); text-transform: uppercase; letter-spacing: 0.2em; font-size: 12px; }
          .row span:last-child { font-style: italic; }
          form { margin-top: 24px; }
          button {
            width: 100%; padding: 14px; border-radius: 999px; border: 0;
            background: var(--gold); color: var(--ink-deep);
            font-weight: 700; text-transform: uppercase; letter-spacing: 0.25em;
            cursor: pointer;
          }
          button.cancel { background: transparent; color: var(--parchment); border: 1px solid rgba(217, 182, 122, 0.4); margin-top: 8px; }
          .stamp { color: rgba(217, 182, 122, 0.7); font-size: 12px; letter-spacing: 0.32em; text-transform: uppercase; }
          a { color: var(--gold); }
        </style>
      </head>
      <body>
        <div class="card">
          <p class="stamp">Demo pay · No real charge</p>
          <h1>Confirm payment · $32</h1>
          <div class="row"><span>Order</span><span>${order.id}</span></div>
          <div class="row"><span>Headline</span><span>${escape(order.design.headline)}</span></div>
          <div class="row"><span>Garment</span><span>${order.design.garmentColor}, ${order.design.garmentSize.toUpperCase()}</span></div>
          <div class="row"><span>Ship to</span><span>${escape(order.recipient?.name ?? "")}, ${escape(order.recipient?.city ?? "")}, ${escape(order.recipient?.country ?? "")}</span></div>

          <form method="POST" action="/api/demo-pay/${encodeURIComponent(params.id)}?paid=1">
            <button type="submit">Simulate successful payment</button>
          </form>
          <form method="POST" action="/api/demo-pay/${encodeURIComponent(params.id)}?cancel=1" style="margin-top:8px">
            <button type="submit" class="cancel">Cancel order</button>
          </form>
          <p style="margin-top: 20px; font-size: 13px;">
            This page is shown when no Stripe API key is configured. Setting
            <code>STRIPE_SECRET_KEY</code> in the environment switches the
            store to use real Stripe Checkout.
          </p>
        </div>
      </body>
    </html>
    `
  );
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const storage = getStorage();
  const order = await storage.readOrder(params.id);
  if (!order) {
    return NextResponse.json({ error: "order not found" }, { status: 404 });
  }
  const sp = req.nextUrl.searchParams;
  if (sp.get("cancel") === "1") {
    order.status = "cancelled";
    order.updatedAt = new Date().toISOString();
    await storage.writeOrder(order);
    return NextResponse.redirect(
      `${getAppBaseUrl(process.env)}/design?cancelled=1`,
      303
    );
  }

  // Mark paid and immediately submit to Prodigi.
  order.status = "paid";
  order.updatedAt = new Date().toISOString();
  await storage.writeOrder(order);

  await fulfillOrder(order, {
    prodigi: getProdigi({ PRODIGI_API_KEY: process.env.PRODIGI_API_KEY }),
    storage,
    appBaseUrl: getAppBaseUrl(process.env),
  });

  return NextResponse.redirect(
    `${getAppBaseUrl(process.env)}/success?orderId=${encodeURIComponent(
      order.id
    )}&demoSessionId=${encodeURIComponent(params.id)}`,
    303
  );
}

function html(status: number, body: string): NextResponse {
  return new NextResponse(body, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
