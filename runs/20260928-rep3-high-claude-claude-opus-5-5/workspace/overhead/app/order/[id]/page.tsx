import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type Stripe from "stripe";
import { Mockup } from "@/components/Art";
import { colorByKey, formatMoney } from "@/lib/catalog";
import { formatMomentDate, formatMomentTime, unpackDesign } from "@/lib/design";
import { fulfillCheckoutSession } from "@/lib/server/fulfill";
import { ProdigiOrder, getProdigiOrder } from "@/lib/server/prodigi";
import { stripe } from "@/lib/server/stripe";
import { ClearBag } from "./ClearBag";

export const metadata: Metadata = { title: "Your order — Overhead", robots: { index: false } };
export const dynamic = "force-dynamic";

function stages(order: ProdigiOrder | null) {
  const d = order?.status?.details ?? {};
  const started = (k: string) => d[k] && d[k] !== "NotStarted";
  const shipped = d.shipping === "Complete" || order?.status?.stage === "Complete";
  return [
    { label: "Paid", done: true },
    { label: "Sent to print", done: !!order },
    { label: "Printing", done: started("inProduction") || shipped },
    { label: "Shipped", done: shipped },
  ];
}

export default async function OrderPage({ params }: PageProps<"/order/[id]">) {
  const { id } = await params;
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(id)) notFound();

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe().checkout.sessions.retrieve(id);
  } catch {
    notFound();
  }

  const paid = session.payment_status === "paid";
  let prodigiOrderId: string | null = null;
  let fulfilError = false;
  if (paid) {
    // The webhook normally does this first; calling it here is an idempotent safety net.
    try {
      const r = await fulfillCheckoutSession(id);
      if (r.status === "submitted") prodigiOrderId = r.prodigiOrderId;
    } catch (e) {
      console.error("[order page] fulfilment fallback failed", e);
      fulfilError = true;
    }
  }
  const prodigi = prodigiOrderId ? await getProdigiOrder(prodigiOrderId) : null;
  const lineItems = await stripe().checkout.sessions.listLineItems(id, { limit: 100, expand: ["data.price.product"] });
  const ship = session.collected_information?.shipping_details;
  const a = ship?.address;
  const tracking = prodigi?.shipments?.find((s) => s.tracking?.url)?.tracking;

  return (
    <div className="wrap order">
      {paid && <ClearBag />}
      <p className="eyebrow">Order {id.slice(-8).toUpperCase()}</p>
      {paid ? (
        <>
          <h1>Your sky is on its way to the printer.</h1>
          <p className="lede">
            Thank you{session.customer_details?.name ? `, ${session.customer_details.name.split(" ")[0]}` : ""}. A receipt is on its
            way to {session.customer_details?.email}. Each shirt is printed to order, so it usually leaves the print studio in 2–4 business days.
          </p>
        </>
      ) : session.status === "open" ? (
        <>
          <h1>Payment not completed</h1>
          <p className="lede">This checkout hasn&rsquo;t been paid yet. Nothing will be printed until it is.</p>
          <p><a className="btn btn-gold" href={session.url ?? "/bag"}>Return to checkout</a></p>
        </>
      ) : (
        <>
          <h1>We&rsquo;re confirming your payment.</h1>
          <p className="lede">Some payment methods take a little longer. We&rsquo;ll send your shirt to print the moment it clears. Refresh this page to check.</p>
        </>
      )}

      {paid && (
        <div className="status-track">
          {stages(prodigi).map((s) => (
            <div key={s.label} className={`status-step ${s.done ? "done" : ""}`}>{s.done ? "✓ " : ""}{s.label}</div>
          ))}
        </div>
      )}
      {fulfilError && (
        <div className="notice err">Your payment went through. We hit a snag handing the order to our print studio and we&rsquo;re retrying automatically. There&rsquo;s nothing you need to do.</div>
      )}

      <dl className="kv">
        {prodigiOrderId && (<><dt>Print order</dt><dd>{prodigiOrderId} · {prodigi?.status?.stage ?? "Received"}</dd></>)}
        {tracking?.url && (<><dt>Tracking</dt><dd><a href={tracking.url}>{tracking.number ?? "Track package"}</a></dd></>)}
        {ship && a && (<><dt>Shipping to</dt><dd>{ship.name}<br />{a.line1}{a.line2 ? `, ${a.line2}` : ""}<br />{a.city}{a.state ? `, ${a.state}` : ""} {a.postal_code} · {a.country}</dd></>)}
        <dt>Total paid</dt><dd>{formatMoney(session.amount_total ?? 0)} {session.currency?.toUpperCase()}</dd>
      </dl>

      <div className="order-items">
        {lineItems.data.map((li, i) => {
          const product = li.price?.product as Stripe.Product;
          let design = null;
          try {
            design = unpackDesign(product.metadata.design);
          } catch {}
          return (
            <div className="line" key={li.id}>
              <div className="thumb">{design && <Mockup design={design} id={`o${i}`} />}</div>
              <div>
                <h3>{design?.title || "Untitled sky"}</h3>
                {design && (
                  <p className="meta">
                    {design.place} · {formatMomentDate(design.date)}, {formatMomentTime(design.time)}
                    <br />
                    {colorByKey(design.color).label} · Size {product.metadata.size?.toUpperCase()} · Qty {li.quantity}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <p style={{ marginTop: 30 }}><Link href="/design" className="btn btn-ghost">Design another sky</Link></p>
    </div>
  );
}
