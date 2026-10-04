import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { colorLabel } from "@/lib/catalog";
import { encodeDesign } from "@/lib/design";
import { fulfill, loadOrder, type OrderInfo } from "@/lib/fulfill";
import { getOrder } from "@/lib/prodigi";
import { baseUrl } from "@/lib/site";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const STAGES: Record<string, string> = {
  InProgress: "In production",
  Complete: "Shipped",
  Cancelled: "Cancelled",
};

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(id)) notFound();

  const h = await headers();
  const origin = baseUrl(new Request("http://x", { headers: h }));

  let info: OrderInfo;
  let fulfilError: string | null = null;
  try {
    info = await loadOrder(id);
  } catch {
    notFound();
  }
  // Belt and braces: if the webhook hasn't landed yet, submit the paid order now (idempotent).
  if (info.paid && !info.prodigiOrderId) {
    try {
      info = await fulfill(id, origin);
    } catch (e: any) {
      console.error("[order page] fulfil failed", id, e);
      fulfilError = "We’ve got your payment, and our rangers are queuing your print — this page will update shortly.";
    }
  }

  let prodigi: any = null;
  if (info.prodigiOrderId) {
    try {
      prodigi = (await getOrder(info.prodigiOrderId)).order;
    } catch (e) {
      console.error("[order page] prodigi lookup failed", e);
    }
  }

  const s = info.session;
  const ship = s.collected_information?.shipping_details ?? (s as any).shipping_details;
  const d = info.design;
  const stage = prodigi?.status?.stage as string | undefined;
  const shipments: any[] = prodigi?.shipments ?? [];

  return (
    <main className="order">
      {info.paid ? (
        <>
          <p className="eyebrow">Park established</p>
          <h1>Thank you{s.customer_details?.name ? `, ${s.customer_details.name.split(" ")[0]}` : ""}!</h1>
          <p className="lede">
            {d ? `${d.name} National Park` : "Your park"} is headed to the print lab. We’ll email{" "}
            {s.customer_details?.email ?? "you"} when it ships.
          </p>
        </>
      ) : (
        <>
          <p className="eyebrow">Awaiting payment</p>
          <h1>Almost there</h1>
          <p className="lede">We haven’t received payment for this order yet. If you just paid, refresh in a moment.</p>
        </>
      )}

      <div className="order-grid">
        {d && <img className="order-badge" src={`/api/design?d=${encodeDesign(d)}`} alt="Your park badge" />}
        <dl className="order-facts">
          <dt>Order</dt>
          <dd>{s.id.slice(-10).toUpperCase()}</dd>
          <dt>Shirt</dt>
          <dd>
            {info.quantity} × {colorLabel(info.color)} Bella+Canvas 3001, size {info.size.toUpperCase()}
          </dd>
          <dt>Paid</dt>
          <dd>{s.amount_total != null ? `$${(s.amount_total / 100).toFixed(2)} ${s.currency?.toUpperCase()}` : "—"}</dd>
          {ship?.address && (
            <>
              <dt>Ships to</dt>
              <dd>
                {ship.name}
                <br />
                {ship.address.line1}
                {ship.address.line2 ? `, ${ship.address.line2}` : ""}
                <br />
                {[ship.address.city, ship.address.state, ship.address.postal_code].filter(Boolean).join(", ")}{" "}
                {ship.address.country}
              </dd>
            </>
          )}
          <dt>Print status</dt>
          <dd>
            {fulfilError ??
              (info.prodigiOrderId
                ? `${stage ? STAGES[stage] ?? stage : "Submitted"} · lab order ${info.prodigiOrderId}`
                : info.paid
                  ? "Queued"
                  : "Not started")}
          </dd>
          {shipments
            .filter((sh) => sh.tracking?.url)
            .map((sh) => (
              <div key={sh.id}>
                <dt>Tracking</dt>
                <dd>
                  <a href={sh.tracking.url}>{sh.tracking.number || "Track package"}</a>
                </dd>
              </div>
            ))}
        </dl>
      </div>
      <p>
        <a className="buy secondary" href="/">
          Establish another park
        </a>
      </p>
    </main>
  );
}
