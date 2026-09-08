import type { Metadata } from "next";
import Link from "next/link";
import { getOrder, isSandbox } from "@/lib/prodigi";
import { SAINTS, SIZE_LABEL, GARMENTS } from "@/lib/catalog";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Order status" };

const STAGE_COPY: Record<string, string> = {
  InProgress: "Accepted. Your shirt is queued for printing.",
  Complete: "Printed and dispatched.",
  Cancelled: "This order was cancelled.",
};

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await getOrder(id).catch(() => null);

  return (
    <div className="wrap narrow" style={{ padding: "44px 20px 60px" }}>
      {!order ? (
        <>
          <h1 className="title">We can&rsquo;t find that order</h1>
          <p className="muted">Check the link in your confirmation, or <Link href="/">start again</Link>.</p>
        </>
      ) : (
        <>
          <div className="rule-orn caps">Order received</div>
          <h1 className="title center" style={{ marginTop: 14 }}>Thank you.</h1>
          <p className="center muted" style={{ marginBottom: 30 }}>
            Reference <strong>{order.merchantReference ?? order.id}</strong>
          </p>

          {isSandbox() && (
            <p className="notice" style={{ marginBottom: 22 }}>
              This store is running against Prodigi&rsquo;s <strong>sandbox</strong>. The order below is
              real in Prodigi&rsquo;s test environment but no shirt will be printed or shipped.
            </p>
          )}

          <div className="panel">
            <div className="totals"><span className="caps">Status</span><span>{order.status?.stage}</span></div>
            <p className="muted" style={{ margin: "6px 0 0" }}>
              {STAGE_COPY[order.status?.stage ?? ""] ?? "We&rsquo;ll email you when it ships."}
            </p>

            {order.status?.issues?.length ? (
              <div className="notice bad" style={{ marginTop: 16 }}>
                <strong>Needs attention</strong>
                <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
                  {order.status.issues.map((i, n) => <li key={n}>{i.description || i.errorCode}</li>)}
                </ul>
              </div>
            ) : null}

            <div style={{ marginTop: 22, borderTop: "1px solid var(--rule)", paddingTop: 16 }}>
              {(order.items ?? []).map((it, n) => {
                const [slug, color, size] = (it.merchantReference ?? "").split("|");
                const saint = SAINTS.find((s) => s.slug === slug);
                const g = GARMENTS.find((x) => x.id === color);
                return (
                  <div key={it.id ?? n} className="totals">
                    <span>
                      {saint ? `${saint.plateName} ${saint.epithet}` : it.sku}
                      <span className="muted">
                        {g ? ` · ${g.label}` : ""}{size ? ` · ${SIZE_LABEL[size] ?? size}` : ""}
                      </span>
                    </span>
                    <span>×{it.copies}</span>
                  </div>
                );
              })}
            </div>

            {(order.shipments ?? []).map((s) => (
              <div key={s.id} className="notice good" style={{ marginTop: 16 }}>
                Shipped via {s.carrier?.name ?? "carrier"} {s.carrier?.service ?? ""}
                {s.tracking?.url ? <> — <a href={s.tracking.url}>track {s.tracking.number}</a></> : null}
              </div>
            ))}
          </div>

          <p className="center" style={{ marginTop: 28 }}>
            <Link className="btn ghost" href="/">Back to the saints</Link>
          </p>
        </>
      )}
    </div>
  );
}
