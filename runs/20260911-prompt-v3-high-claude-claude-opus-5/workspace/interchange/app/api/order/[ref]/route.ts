import { NextRequest } from "next/server";
import { readArtToken } from "@/lib/art";
import { describeStage, findByReference } from "@/lib/prodigi";
import { fulfilStripeSession } from "@/lib/stripeFulfil";
import { stripeEnabled } from "@/lib/stripe";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: NextRequest, ctx: { params: Promise<{ ref: string }> }) {
  const { ref } = await ctx.params;
  const sessionId = req.nextUrl.searchParams.get("session_id");

  // Belt and braces: if the buyer got here before the webhook landed (or the
  // webhook is not wired up yet), finish the job now. fulfil() is idempotent.
  let paymentNote: string | null = null;
  if (sessionId && stripeEnabled()) {
    try {
      const r = await fulfilStripeSession(sessionId);
      if (r.status !== "paid") paymentNote = r.reason;
    } catch (err: any) {
      paymentNote = `Could not confirm payment: ${err.message}`;
    }
  }

  const order = await findByReference(ref).catch(() => null);
  if (!order) {
    return Response.json(
      { ref, found: false, paymentNote: paymentNote ?? "We have not received this order yet." },
      { status: 200 },
    );
  }

  const frontAsset = order.items[0]?.assets.find((a) => a.printArea === "front");
  const token = frontAsset ? /\/api\/art\/([^/]+?)\.png/.exec(frontAsset.url)?.[1] : undefined;
  const spec = token ? readArtToken(token)?.s : undefined;

  return Response.json({
    ref,
    found: true,
    paymentNote,
    prodigiOrderId: order.id,
    created: order.created,
    stage: describeStage(order),
    rawStage: order.status.stage,
    details: order.status.details,
    issues: order.status.issues,
    shippingMethod: order.shippingMethod,
    recipient: { name: order.recipient.name, city: order.recipient.address.townOrCity, country: order.recipient.address.countryCode },
    item: order.items[0]
      ? {
          sku: order.items[0].sku,
          copies: order.items[0].copies,
          attributes: order.items[0].attributes,
          assetStatus: order.items[0].assets.map((a) => ({ printArea: a.printArea, status: a.status })),
        }
      : null,
    shipments: order.shipments.map((s) => ({
      carrier: s.carrier?.name ?? null,
      service: s.carrier?.service ?? null,
      tracking: s.tracking?.number ?? null,
      trackingUrl: s.tracking?.url ?? null,
      dispatchDate: s.dispatchDate ?? null,
    })),
    artToken: token ?? null,
    spec: spec ?? null,
  });
}
