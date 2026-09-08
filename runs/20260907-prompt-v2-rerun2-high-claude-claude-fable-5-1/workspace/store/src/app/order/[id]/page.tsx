import Link from "next/link";
import { notFound } from "next/navigation";
import { getColor, getProduct, getSize } from "@/lib/catalog";
import { describeStatus, getOrder } from "@/lib/prodigi";

export const dynamic = "force-dynamic";
export const metadata = { title: "Order status" };

const STEPS = ["Received", "In production", "Packing", "Shipped"];

export default async function OrderPage({ params }: PageProps<"/order/[id]">) {
  const { id } = await params;
  const order = await getOrder(id);
  if (!order) notFound();
  const status = describeStatus(order);
  const tracking = order.shipments.filter((s) => s.tracking?.number || s.tracking?.url);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <p className="text-xs uppercase tracking-widest text-ink-2 mb-4">
        <Link href="/" className="hover:underline">Home</Link> / Order {order.id}
      </p>
      <h1 className="font-slab text-4xl">
        {status.label}
        {order.status.stage === "Cancelled" ? "" : "."}
      </h1>
      <p className="mt-2 text-sm text-ink-2">
        Order <span className="font-bold text-ink">{order.id}</span> · placed {new Date(order.created).toLocaleDateString("en-US", { dateStyle: "medium" })} · {order.shippingMethod} shipping
        {order.recipient?.address ? ` to ${order.recipient.address.townOrCity}, ${order.recipient.address.countryCode}` : ""}
      </p>

      <ol className="mt-8 grid grid-cols-4 gap-2 text-xs uppercase tracking-wider">
        {STEPS.map((label, i) => {
          const done = status.step >= i + 1;
          return (
            <li key={label} className={`border-t-4 pt-2 ${done ? "border-accent" : "border-ink/20 text-ink-2"}`}>
              {label}
            </li>
          );
        })}
      </ol>

      <section className="mt-10 card p-6">
        <h2 className="font-slab text-xl">Items</h2>
        <ul className="mt-3 divide-y-2 divide-dashed divide-ink/30 text-sm">
          {order.items.map((i) => {
            const [slug, color, size] = (i.merchantReference || "").split(":");
            return (
              <li key={i.id} className="py-2 flex justify-between gap-4">
                <span>
                  {getProduct(slug)?.bureau ?? i.sku} · {getColor(color)?.label ?? i.attributes?.color} · {getSize(size)?.label ?? i.attributes?.size}
                </span>
                <span className="text-ink-2">×{i.copies}</span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mt-6 dashed p-6 text-sm">
        <h2 className="font-slab text-xl">Shipping</h2>
        {tracking.length === 0 ? (
          <p className="mt-2 text-ink-2">Tracking details appear here once the lab dispatches your parcel.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {tracking.map((s) => (
              <li key={s.id}>
                {s.carrier?.name ? <b>{s.carrier.name}</b> : "Carrier"} {s.carrier?.service ? `(${s.carrier.service})` : ""} ·{" "}
                {s.tracking?.url ? (
                  <a className="underline" href={s.tracking.url} target="_blank" rel="noreferrer">
                    {s.tracking.number || "Track parcel"}
                  </a>
                ) : (
                  s.tracking?.number
                )}
              </li>
            ))}
          </ul>
        )}
        {order.status.issues?.length ? (
          <p className="mt-3 text-stamp font-bold">There is an issue with this order: {order.status.issues.map((i) => i.description).join("; ")}. We will contact you.</p>
        ) : null}
        <p className="mt-4 text-xs text-ink-2">Last updated {new Date(order.lastUpdated).toLocaleString("en-US")}. Refresh this page for the latest status.</p>
      </section>
    </div>
  );
}
