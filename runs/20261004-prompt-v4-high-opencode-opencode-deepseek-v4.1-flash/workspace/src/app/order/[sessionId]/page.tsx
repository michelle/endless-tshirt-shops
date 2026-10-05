import Link from "next/link";
import { ensureFulfilled, loadOrder, type OrderView } from "@/lib/fulfill";
import { encodeDesign } from "@/lib/schema";
import { formatMoney } from "@/lib/catalog";
import { stripeConfigured } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export default async function OrderPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;

  if (!stripeConfigured()) {
    return <Shell title="Order status" body={<p className="note">Payments are not configured on this deployment.</p>} />;
  }

  let view: OrderView | null = null;
  let fulfilmentError: string | null = null;
  try {
    view = await loadOrder(sessionId);
  } catch (error) {
    fulfilmentError = (error as Error).message;
  }

  // The webhook is the primary path; this makes the confirmation page a
  // reliable fallback without ever placing an order for an unpaid session.
  if (view && view.paymentStatus === "paid" && !view.prodigi) {
    try {
      await ensureFulfilled(sessionId);
      view = await loadOrder(sessionId);
    } catch (error) {
      fulfilmentError = (error as Error).message;
    }
  }

  if (!view) {
    return (
      <Shell
        title="We couldn't find that order"
        body={<p className="note">{fulfilmentError ?? "The checkout session may have expired. If you were charged, contact us and we will find it."}</p>}
      />
    );
  }

  const paid = view.paymentStatus === "paid";
  const designToken = view.design ? encodeDesign(view.design) : "";
  const stage = view.prodigi?.stage;

  return (
    <Shell
      title={paid ? "Thank you — your sky is in production." : "Waiting for payment"}
      body={
        <div className="status-grid">
          <div className="card">
            {designToken && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/api/design?d=${designToken}`}
                alt="Your night sky design"
                style={{ width: "100%", borderRadius: 10, border: "1px solid var(--line)" }}
              />
            )}
          </div>
          <div className="card">
            <h2>Order summary</h2>
            <dl className="kv">
              <dt>Status</dt>
              <dd>
                <span className={`pill ${paid ? "ok" : "warn"}`}>{paid ? "Paid" : view.paymentStatus}</span>
              </dd>
              {view.design && (
                <>
                  <dt>Title</dt>
                  <dd>{view.design.title}</dd>
                  <dt>Moment</dt>
                  <dd>
                    {view.design.date} · {view.design.time} · {view.design.place}
                  </dd>
                </>
              )}
              {view.selection && (
                <>
                  <dt>Garment</dt>
                  <dd>
                    {view.selection.colorLabel} Softstyle 64000 · {view.selection.size.toUpperCase()} × {view.selection.quantity}
                  </dd>
                </>
              )}
              {view.amountTotal != null && (
                <>
                  <dt>Total</dt>
                  <dd>{formatMoney(view.amountTotal, view.currency ?? "usd")}</dd>
                </>
              )}
              {view.email && (
                <>
                  <dt>Receipt to</dt>
                  <dd>{view.email}</dd>
                </>
              )}
              {view.shipTo && (
                <>
                  <dt>Ship to</dt>
                  <dd>
                    {view.shipTo.name}
                    <br />
                    {[view.shipTo.address.line1, view.shipTo.address.line2, view.shipTo.address.city, view.shipTo.address.state, view.shipTo.address.postal_code, view.shipTo.address.country]
                      .filter(Boolean)
                      .join(", ")}
                  </dd>
                </>
              )}
              <dt>Fulfilment</dt>
              <dd>
                {view.prodigi ? (
                  <>
                    Prodigi order <code>{view.prodigi.id}</code> · stage {stage}
                    {view.prodigi.shipments.length > 0 && (
                      <ul style={{ paddingLeft: 18, margin: "8px 0 0" }}>
                        {view.prodigi.shipments.map((shipment) => (
                          <li key={shipment.id}>
                            {shipment.carrier?.service ?? shipment.carrier?.name ?? "Shipped"}
                            {shipment.tracking?.url ? (
                              <>
                                {" — "}
                                <a href={shipment.tracking.url} style={{ color: "var(--gold)" }}>
                                  tracking {shipment.tracking.number}
                                </a>
                              </>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    )}
                    {view.prodigi.error && <div className="note">Status temporarily unavailable.</div>}
                  </>
                ) : fulfilmentError ? (
                  <span style={{ color: "var(--danger)" }}>Fulfilment pending — {fulfilmentError}</span>
                ) : (
                  "Preparing your print file…"
                )}
              </dd>
            </dl>
            {paid && (
              <p className="note" style={{ marginTop: 18 }}>
                A receipt has been emailed by Stripe. We only send an order to production after payment
                has cleared. You can safely close this page.
              </p>
            )}
            <p style={{ marginTop: 18 }}>
              <Link href="/" style={{ color: "var(--gold)" }}>
                ← Make another
              </Link>
            </p>
          </div>
        </div>
      }
    />
  );
}

function Shell({ title, body }: { title: string; body: React.ReactNode }) {
  return (
    <>
      <header className="site-header">
        <div className="container">
          <Link className="wordmark" href="/">
            ASTER<span>.</span>
          </Link>
        </div>
      </header>
      <main className="order container">
        <h1>{title}</h1>
        {body}
      </main>
    </>
  );
}
