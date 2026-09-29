import { orderStatus } from "../../../lib/fulfill.js";
import { signArtParams } from "../../../lib/sign.js";

export const dynamic = "force-dynamic";

const STAGE_LABELS = {
  NotStarted: "Not started",
  InProgress: "In progress",
  Complete: "Done",
  HasIssues: "Needs attention",
  NotApplicable: "—",
};

export default async function OrderPage({ params }) {
  const { id } = await params;
  const status = await orderStatus(id).catch(() => null);

  if (!status) {
    return (
      <main className="wrap">
        <div className="panel">
          <h1>Order not found</h1>
          <p>We couldn&apos;t find an order for that reference. Check the link from your receipt.</p>
        </div>
      </main>
    );
  }

  const md = status.metadata || {};
  const artSrc =
    md.word && md.palette && md.color && md.size
      ? `/api/art?${signArtParams({ w: md.word, p: md.palette, c: md.color, s: md.size })}&thumb=1`
      : null;
  const po = status.prodigi;

  return (
    <main className="wrap">
      <div className="panel">
        <span className={`status-pill ${status.paid ? "ok" : "warn"}`}>
          {status.paid ? "Paid" : "Awaiting payment"}
        </span>
        <h1 style={{ marginTop: "18px" }}>“{md.word}” — № {md.edition}</h1>
        <p>A one-of-one tee, grown from your word and printed exactly once.</p>

        <div style={{ display: "grid", gridTemplateColumns: artSrc ? "1fr 220px" : "1fr", gap: "30px", marginTop: "10px", alignItems: "start" }}>
          <div className="kv" style={{ marginTop: "10px", borderTop: "none" }}>
            <div><span>Shirt</span><span>{md.color} · {(md.size || "").toUpperCase()} · ×{md.qty || 1}</span></div>
            <div><span>Total</span><span>{status.amountTotal != null ? `$${(status.amountTotal / 100).toFixed(2)} ${String(status.currency || "usd").toUpperCase()}` : "—"}</span></div>
            <div><span>Lab order</span><span>{po ? po.id : "not sent yet"}</span></div>
            <div><span>Lab status</span><span>{po ? po.stage : "—"}</span></div>
            {po?.shipments?.map((s, i) => (
              <div key={i}>
                <span>Shipment</span>
                <span>
                  {s.status}
                  {s.tracking?.url ? (
                    <> · <a href={s.tracking.url} style={{ color: "var(--accent)" }}>track</a></>
                  ) : null}
                </span>
              </div>
            ))}
          </div>
          {artSrc && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={artSrc} alt={`Artwork grown from “${md.word}”`} style={{ width: "100%", borderRadius: "10px", background: "#000" }} />
          )}
        </div>
      </div>
    </main>
  );
}
