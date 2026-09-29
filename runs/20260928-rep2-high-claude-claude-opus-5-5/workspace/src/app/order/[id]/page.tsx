import Link from "next/link";
import { notFound } from "next/navigation";
import Example from "@/components/Example";
import { SHIRTS, decodeDesign, formatWhen } from "@/lib/design";
import { fulfillCheckoutSession } from "@/lib/fulfill";
import { getOrder } from "@/lib/prodigi";
import { stripe, unchunkMetadata } from "@/lib/stripe";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your order — Overhead" };

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(id)) notFound();

  let session;
  try {
    session = await stripe().checkout.sessions.retrieve(id, { expand: ["line_items"] });
  } catch {
    notFound();
  }

  const paid = session.status === "complete" && session.payment_status === "paid";
  let prodigiId = session.metadata?.prodigi_order_id;
  let fulfilError: string | null = null;

  // Fallback in case the webhook hasn't landed yet. Idempotent, and re-verifies payment with Stripe.
  if (paid && !prodigiId) {
    try {
      const r = await fulfillCheckoutSession(id);
      if (r.status === "submitted") prodigiId = r.prodigiOrderId;
    } catch (e) {
      console.error("order page fulfillment fallback failed", e);
      fulfilError = "We’ve got your payment and are preparing your order — this page will update shortly.";
    }
  }

  let stage: string | null = null;
  let tracking: { number: string; url: string } | undefined;
  if (prodigiId) {
    try {
      const { order } = await getOrder(prodigiId);
      stage = order.status.stage;
      tracking = order.shipments?.find((s) => s.tracking?.url)?.tracking;
    } catch (e) {
      console.error("prodigi lookup failed", e);
    }
  }

  let design = null;
  try {
    design = decodeDesign(unchunkMetadata("design", session.metadata));
  } catch {}

  const qty = session.line_items?.data[0]?.quantity ?? 1;
  const total = session.amount_total != null ? `$${(session.amount_total / 100).toFixed(2)}` : "—";
  const stageLabel: Record<string, string> = {
    InProgress: "In production",
    Complete: "Shipped",
    Cancelled: "Cancelled",
  };

  return (
    <main className="wrap order">
      <div className="eyebrow">{paid ? "Order confirmed" : "Order pending"}</div>
      <h2>{paid ? "Thank you — your sky is on its way to the printer." : "We haven’t received payment for this order yet."}</h2>
      {paid && (
        <p className="muted">
          Order details are linked to {session.customer_details?.email ?? "your email"}. Bookmark this page — it updates as
          your shirt moves through printing and shipping.
        </p>
      )}
      <div className="status">
        <div><span>Order</span><span>{id.slice(-12).toUpperCase()}</span></div>
        <div><span>Payment</span><span className={paid ? "ok" : ""}>{paid ? `Paid · ${total}` : session.payment_status}</span></div>
        {design && (
          <div>
            <span>Shirt</span>
            <span>{qty} × {SHIRTS[design.shirt].label}, size {String(session.metadata?.size ?? "").toUpperCase()}</span>
          </div>
        )}
        {design && <div><span>Sky</span><span>{design.place} · {formatWhen(design.when)}</span></div>}
        <div>
          <span>Production</span>
          <span className={prodigiId ? "ok" : ""}>
            {prodigiId ? `${stageLabel[stage ?? ""] ?? stage ?? "Received"} · ref ${prodigiId}` : paid ? "Queued" : "Waiting for payment"}
          </span>
        </div>
        {tracking && (
          <div><span>Tracking</span><a href={tracking.url} target="_blank" rel="noreferrer">{tracking.number}</a></div>
        )}
      </div>
      {fulfilError && <p className="muted">{fulfilError}</p>}
      {design && (
        <div style={{ maxWidth: 460, margin: "0 auto" }}>
          <Example design={design} link={false} />
        </div>
      )}
      <p style={{ textAlign: "center", marginTop: 30 }}>
        <Link className="btn ghost" href="/design">Design another</Link>
      </p>
    </main>
  );
}
