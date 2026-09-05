import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Shirt from "@/components/Shirt";
import { ensureFulfilled, refreshFulfillment, retrieveIntent, toOrderView } from "@/lib/fulfill";
import { STYLES, formatMoney, formatUtc } from "@/lib/products";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "your order · datetime.store", robots: { index: false } };

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let pi = await retrieveIntent(id);
  if (!pi) notFound();
  pi = await ensureFulfilled(pi);
  pi = await refreshFulfillment(pi);
  const order = toOrderView(pi);
  const f = order.fulfillment;

  return (
    <main className="container">
      <Header />
      <div className="grid">
        <div>
          {order.style && order.timestamp ? <Shirt style={order.style} frozenAt={order.timestamp} /> : null}
          {order.artworkUrl ? (
            <p className="Shirt-caption">
              <a href={order.artworkUrl} target="_blank" rel="noreferrer">
                View the print file
              </a>{" "}
              (transparent PNG, the exact file sent to the printer).
            </p>
          ) : null}
        </div>
        <div>
          <h3 style={{ fontWeight: 400, fontSize: 22, margin: "4px 0 6px" }}>
            {order.paid ? "Thanks — your shirt is on its way to the printer." : "Payment not completed yet."}
          </h3>
          <dl className="order-meta">
            <dt>Order</dt>
            <dd>
              <code>{order.id}</code>
            </dd>
            <dt>Reads</dt>
            <dd>
              <code>{order.timestamp}</code>
              {order.timestamp ? <div className="fineprint">{formatUtc(order.timestamp)}</div> : null}
            </dd>
            <dt>Shirt</dt>
            <dd>
              {order.style ? `${STYLES[order.style].label} · ${order.size} · black` : "—"}
              {order.sku ? <div className="fineprint">{order.sku}</div> : null}
            </dd>
            <dt>Paid</dt>
            <dd>
              {formatMoney(order.amount, order.currency)}{" "}
              <span className={`badge ${order.paid ? "badge-ok" : ""}`}>{order.paymentStatus.replace(/_/g, " ")}</span>
            </dd>
            <dt>Ship to</dt>
            <dd>
              {order.shipping
                ? [order.shipping.name, order.shipping.city, order.shipping.state, order.shipping.country].filter(Boolean).join(", ")
                : "—"}
            </dd>
            <dt>Printing</dt>
            <dd>
              {f.orderId ? (
                <>
                  <code>{f.orderId}</code>{" "}
                  <span className={`badge ${f.stage === "Cancelled" ? "badge-err" : "badge-ok"}`}>{f.status ?? f.stage ?? "submitted"}</span>
                  {f.sandbox ? <span className="badge" style={{ marginLeft: 6 }}>sandbox</span> : null}
                </>
              ) : order.paid ? (
                <span className="badge badge-err">{f.error ? "needs attention" : "pending"}</span>
              ) : (
                "—"
              )}
              {f.error && !f.orderId ? <div className="fineprint">{f.error}</div> : null}
            </dd>
            {order.email ? (
              <>
                <dt>Receipt</dt>
                <dd>{order.email}</dd>
              </>
            ) : null}
          </dl>
          <p className="fineprint">
            Printing takes 2–5 business days, then Standard shipping. This page updates as the printer reports progress.
          </p>
        </div>
      </div>
      <Footer testMode={f.sandbox} />
    </main>
  );
}
