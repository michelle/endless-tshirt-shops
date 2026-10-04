import type { Metadata } from "next";
import Link from "next/link";
import { stripe } from "@/lib/stripe";
import { siteOrigin } from "@/lib/origin";
import { fulfillSession } from "@/lib/fulfillment";
import { getOrder } from "@/lib/prodigi";
import { itemsFromMetadata } from "@/lib/orders";
import { ClearCart } from "@/components/ClearCart";
import { money, SHIRT_COLORS, SIZE_LABEL } from "@/lib/catalog";
import { designToParam } from "@/lib/design";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const metadata: Metadata = { title: "Your order", robots: { index: false } };

function stage(order: any): number {
  const s = order?.status?.stage;
  if (s === "Complete") return 3;
  if (order?.shipments?.length) return 3;
  if (s === "InProgress") return 2;
  return 1;
}

export default async function OrderPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId)) return <NotFound />;

  let session;
  try {
    session = await stripe().checkout.sessions.retrieve(sessionId);
  } catch {
    return <NotFound />;
  }

  if (session.payment_status !== "paid") {
    return (
      <div className="page prose">
        <h1>Payment not completed</h1>
        <p className="muted">We haven&rsquo;t received payment for this order, so nothing has been sent to print. Your cart is still saved.</p>
        <Link className="btn" href="/cart">Back to cart</Link>
      </div>
    );
  }

  // The webhook normally does this; calling it here is a safe, idempotent fallback.
  let prodigiId = session.metadata?.prodigi_order ?? null;
  let failure = session.metadata?.fulfillment_error ?? null;
  if (!prodigiId && !failure) {
    try {
      const r = await fulfillSession(sessionId, await siteOrigin());
      if (r.state === "fulfilled") prodigiId = r.prodigiOrderId;
      if (r.state === "failed") failure = r.reason;
    } catch (e) {
      console.error("order page fulfil retry failed", e);
    }
  }

  const order = prodigiId ? await getOrder(prodigiId).catch(() => null) : null;
  const items = itemsFromMetadata(session.metadata) ?? [];
  const step = failure ? 0 : prodigiId ? stage(order) : 0;
  const shipments: any[] = order?.shipments ?? [];
  const email = session.customer_details?.email;

  const steps = ["Payment received", "Sent to our print lab", "Printing your shirt", "Shipped"];

  return (
    <div className="page">
      <ClearCart />
      <div className="eyebrow">Order confirmed</div>
      <h1 style={{ fontSize: "2.6rem" }}>Thank you.</h1>
      <p className="muted">
        Order <code>{sessionId.slice(-10)}</code>{email ? <> · confirmation for {email}</> : null}
      </p>

      {failure ? (
        <p className="err" role="alert">
          Your payment went through, but we hit a problem sending your order to print. We have been notified and will fix it or refund you in full. Please contact support with the order number above.
        </p>
      ) : (
        <ol className="timeline">
          {steps.map((label, i) => (
            <li key={label} className={i <= step ? "done" : i === step + 1 ? "now" : ""}>
              <i /> <span>{label}</span>
            </li>
          ))}
        </ol>
      )}

      {shipments.map((sh, i) => (
        <p key={i}>
          Shipped via {sh.carrier?.service || sh.carrier?.name || "carrier"}
          {sh.tracking?.number ? <> · tracking{" "}
            {sh.tracking.url ? <a href={sh.tracking.url} style={{ textDecoration: "underline" }}>{sh.tracking.number}</a> : sh.tracking.number}</> : null}
        </p>
      ))}

      <div style={{ marginTop: 24 }}>
        {items.map((it, i) => {
          const shirt = SHIRT_COLORS.find((s) => s.id === it.design.shirt)!;
          return (
            <div className="line" key={i}>
              <img src={`/api/mockup?fmt=png&bg=1&w=300&d=${designToParam(it.design)}`} alt="" width={110} height={110} />
              <div>
                <h3>{it.design.title || "Your sky"}</h3>
                <div className="meta">{shirt.label} · {SIZE_LABEL[it.size]} · × {it.qty}</div>
                <div className="meta">{it.design.place.name}, {it.design.date}</div>
              </div>
              <span />
            </div>
          );
        })}
      </div>

      {session.amount_total != null && (
        <p className="muted">Total paid: {money(session.amount_total, (session.currency ?? "usd").toUpperCase())}</p>
      )}
      <p className="muted">Made to order, so allow 5&ndash;10 business days plus transit. This page updates as your shirt moves through production.</p>
      <Link href="/design" className="btn ghost">Design another</Link>
    </div>
  );
}

function NotFound() {
  return (
    <div className="page prose">
      <h1>Order not found</h1>
      <Link className="btn" href="/">Back to the store</Link>
    </div>
  );
}
