// app/api/checkout/route.ts
// Persists the design + asset, creates a Stripe (or demo) checkout
// session, and returns the redirect URL. The actual Prodigi submission
// happens in /api/webhook on payment success.

import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { designSchema } from "@/lib/validate";
import { renderDesign } from "@/lib/design";
import { snapshot } from "@/lib/astronomy";
import { svgToPng } from "@/lib/render";
import {
  getAppBaseUrl,
  getPaymentClient,
  getStorage,
} from "@/lib/services";
import { OrderRecord, DesignRecord } from "@/lib/storage";

export const dynamic = "force-dynamic";

interface CheckoutBody {
  design: unknown;
  recipient: {
    name: string;
    email: string;
    line1: string;
    line2?: string;
    city: string;
    state?: string;
    postal: string;
    country: string;
  };
}

const SHIRT_PRICE_CENTS = 3200;

export async function POST(req: NextRequest) {
  let body: CheckoutBody;
  try {
    body = (await req.json()) as CheckoutBody;
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const parsed = designSchema.safeParse(body.design);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid design", fields: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }
  const v = parsed.data;
  const r = body.recipient;
  if (!r?.name || !r.line1 || !r.city || !r.postal || !r.country) {
    return NextResponse.json(
      { error: "shipping address is incomplete" },
      { status: 400 }
    );
  }

  // 1) Render the design.
  const sky = snapshot({
    whenUtc: new Date(v.dateIso),
    lat: v.lat,
    lng: v.lng,
    placeName: v.placeName,
  });
  const designRender = renderDesign(
    {
      dateIso: v.dateIso,
      lat: v.lat,
      lng: v.lng,
      placeName: v.placeName,
      headline: v.headline,
      subtitle: v.subtitle ?? "",
      message: v.message ?? [],
      palette: v.palette,
      garment: v.garmentColor,
    },
    sky
  );

  // 2) Persist the asset. We try PNG first (best fidelity on DTG), but on
//    serverless without resvg's native binary, we fall back to SVG which
//    Prodigi also accepts and rasterises as part of the print pipeline.
  const storage = getStorage();
  await storage.init();
  let assetFilename: string;
  let assetKind: "png" | "svg";
  try {
    // Use full print resolution (4665 px wide) — Prodigi's recommendation
    // for the Gildan 64000 front print area.
    const png = await svgToPng(designRender.svg, { width: 4665 });
    assetFilename = await storage.writeAsset(png.buffer, {
      hash: designRender.hash,
      ext: "png",
    });
    assetKind = "png";
  } catch (e) {
    // Fallback: write the SVG directly. Prodigi accepts SVG and rasterises
    // it to print dpi on their side, so this is acceptable for DTG.
    assetFilename = await storage.writeAsset(
      Buffer.from(designRender.svg, "utf8"),
      { hash: designRender.hash, ext: "svg" }
    );
    assetKind = "svg";
  }

  // 3) Make an OrderRecord.
  const design: DesignRecord = {
    dateIso: v.dateIso,
    lat: v.lat,
    lng: v.lng,
    placeName: v.placeName,
    headline: v.headline,
    subtitle: v.subtitle ?? "",
    message: v.message ?? [],
    palette: v.palette,
    garmentColor: v.garmentColor,
    garmentSize: v.garmentSize,
    quantity: v.quantity,
  };

  const orderId = `uts_${crypto.randomBytes(6).toString("hex")}`;
  const appBaseUrl = getAppBaseUrl(process.env);
  const record: OrderRecord = {
    id: orderId,
    paymentSessionId: "",
    paymentMode: "stripe",
    design,
    status: "awaiting_payment",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    designHash: designRender.hash,
    assetUrl: storage.assetPublicUrl(assetFilename, appBaseUrl),
    recipient: {
      name: r.name,
      email: r.email || undefined,
      line1: r.line1,
      line2: r.line2 || undefined,
      city: r.city,
      state: r.state || undefined,
      postal: r.postal,
      country: r.country,
    },
  };

  // 4) Create payment session.
  const payment = getPaymentClient(process.env);
  const successUrl = `${appBaseUrl}/success?orderId=${encodeURIComponent(
    orderId
  )}`;
  const cancelUrl = `${appBaseUrl}/design?cancelled=1`;
  const session = await payment.createSession({
    items: [
      {
        description: `Under This Sky — ${design.headline}`,
        amountCents: SHIRT_PRICE_CENTS,
        quantity: design.quantity,
      },
    ],
    successUrl,
    cancelUrl,
    currency: "USD",
    metadata: {
      orderId,
      designHash: designRender.hash,
      headline: design.headline,
      place: design.placeName,
    },
  });

  record.paymentSessionId = session.id;
  record.paymentMode = payment.mode;
  if (session.payment_intent) {
    record.stripe = { sessionId: session.id, paymentIntent: session.payment_intent };
  } else {
    record.stripe = { sessionId: session.id };
  }
  await storage.writeOrder(record);

  // 5) Return the redirect URL.
  return NextResponse.json({
    url: session.url,
    orderId,
    sessionId: session.id,
    mode: payment.mode,
  });
}
