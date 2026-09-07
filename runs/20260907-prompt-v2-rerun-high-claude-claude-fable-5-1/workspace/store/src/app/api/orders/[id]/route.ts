import { NextRequest, NextResponse } from "next/server";
import { getDesign, colors } from "@/lib/catalog";
import { getOrderForCustomer } from "@/lib/orders";

export const runtime = "nodejs";

/** Customer-facing order view. Requires the token that was minted at checkout; never exposes other orders. */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const token = req.nextUrl.searchParams.get("t") ?? "";
  try {
    const o = await getOrderForCustomer(id, token);
    if (!o) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    const m = (o.metadata ?? {}) as Record<string, unknown>;
    const num = (v: unknown) => (typeof v === "number" ? v : undefined);
    return NextResponse.json({
      order: {
        id: o.id,
        reference: o.merchantReference,
        created: o.created,
        stage: o.status.stage,
        details: o.status.details,
        issues: (o.status.issues ?? []).map((i) => i.description ?? i.errorCode ?? "Issue"),
        shippingMethod: o.shippingMethod,
        recipient: {
          name: o.recipient.name,
          line1: o.recipient.address.line1,
          line2: o.recipient.address.line2 ?? undefined,
          city: o.recipient.address.townOrCity,
          state: o.recipient.address.stateOrCounty ?? undefined,
          postalCode: o.recipient.address.postalOrZipCode,
          country: o.recipient.address.countryCode,
        },
        items: o.items.map((it) => {
          const slug = it.merchantReference?.split("-").slice(1, -2).join("-") ?? "";
          const colorName = colors.find((c) => c.prodigi === it.attributes.color)?.name ?? it.attributes.color;
          return { name: getDesign(slug)?.name ?? "Tee", color: colorName, size: it.attributes.size, copies: it.copies, status: it.status };
        }),
        shipments: (o.shipments ?? []).map((s) => ({
          carrier: s.carrier?.name,
          service: s.carrier?.service,
          trackingNumber: s.tracking?.number,
          trackingUrl: s.tracking?.url,
          dispatchDate: s.dispatchDate,
        })),
        totals: { subtotalCents: num(m.subtotalCents), shippingCents: num(m.shippingCents), totalCents: num(m.totalCents), payment: m.payment },
        sandbox: m.prodigiEnv !== "live",
      },
    });
  } catch (e) {
    console.error("order lookup failed", e);
    return NextResponse.json({ error: "Could not load the order right now" }, { status: 502 });
  }
}
