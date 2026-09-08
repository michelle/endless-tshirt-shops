import { NextResponse } from "next/server";
import { describeStatus, getOrder } from "@/lib/prodigi";
import { getProduct, getColor, getSize } from "@/lib/catalog";

/** Public order status. Deliberately omits the street address; only city/country and tracking. */
export async function GET(_req: Request, ctx: RouteContext<"/api/orders/[id]">) {
  const { id } = await ctx.params;
  try {
    const order = await getOrder(id);
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    const status = describeStatus(order);
    return NextResponse.json({
      id: order.id,
      created: order.created,
      lastUpdated: order.lastUpdated,
      stage: order.status.stage,
      label: status.label,
      step: status.step,
      shippingMethod: order.shippingMethod,
      destination: {
        name: order.recipient?.name,
        townOrCity: order.recipient?.address?.townOrCity,
        countryCode: order.recipient?.address?.countryCode,
      },
      items: order.items.map((i) => {
        const [slug, color, size] = (i.merchantReference || "").split(":");
        return {
          name: getProduct(slug)?.bureau ?? i.sku,
          color: getColor(color)?.label ?? i.attributes?.color,
          size: getSize(size)?.label ?? i.attributes?.size,
          copies: i.copies,
          status: i.status,
        };
      }),
      shipments: order.shipments.map((s) => ({
        status: s.status,
        carrier: s.carrier?.name,
        service: s.carrier?.service,
        trackingNumber: s.tracking?.number ?? null,
        trackingUrl: s.tracking?.url ?? null,
        dispatchDate: s.dispatchDate ?? null,
      })),
    });
  } catch (e) {
    console.error("order lookup error", e);
    return NextResponse.json({ error: "Could not look up the order." }, { status: 500 });
  }
}
