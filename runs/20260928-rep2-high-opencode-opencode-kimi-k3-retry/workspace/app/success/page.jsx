import Link from "next/link";
import { headers } from "next/headers";
import { fulfillSession, orderStatus } from "../../lib/fulfill.js";
import { signArtParams } from "../../lib/sign.js";

export const dynamic = "force-dynamic";

export default async function SuccessPage({ searchParams }) {
  const sp = await searchParams;
  const sessionId = sp.session_id || "";

  if (!sessionId) {
    return (
      <main className="wrap">
        <div className="panel">
          <h1>Missing session</h1>
          <p>This page is reached after checkout. If you just paid, check your email receipt.</p>
        </div>
      </main>
    );
  }

  const h = await headers();
  const proto = h.get("x-forwarded-proto") || "https";
  const host = h.get("x-forwarded-host") || h.get("host");
  const baseUrl = `${proto}://${host}`;

  // Fallback fulfillment: if the Stripe webhook hasn't fired (or isn't configured),
  // this ensures a paid session still reaches Prodigi. Idempotent by design.
  let fulfill = null;
  try {
    fulfill = await fulfillSession(sessionId, baseUrl);
  } catch (e) {
    fulfill = { fulfilled: false, reason: "error", message: e.message };
  }
  const status = await orderStatus(sessionId).catch(() => null);
  const md = status?.metadata || {};
  const artSrc =
    md.word && md.palette && md.color && md.size
      ? `/api/art?${signArtParams({ w: md.word, p: md.palette, c: md.color, s: md.size })}&thumb=1`
      : null;

  return (
    <main className="wrap">
      <div className="panel">
        {status?.paid ? (
          <>
            <span className="status-pill ok">Paid</span>
            <h1 style={{ marginTop: "18px" }}>Your 1/1 is being born.</h1>
            <p>
              Payment confirmed. Your artwork “{md.word}” — edition № {md.edition} — has been sent
              to the print lab. You&apos;ll get a shipping email when it leaves the lab.
            </p>
          </>
        ) : (
          <>
            <span className="status-pill warn">Awaiting payment</span>
            <h1 style={{ marginTop: "18px" }}>Not paid yet.</h1>
            <p>We haven&apos;t seen a completed payment for this session.</p>
          </>
        )}

        <div style={{ display: "grid", gridTemplateColumns: artSrc ? "1fr 220px" : "1fr", gap: "30px", marginTop: "10px", alignItems: "start" }}>
          <div className="kv" style={{ marginTop: "10px", borderTop: "none" }}>
            <div><span>Word</span><span>{md.word || "—"}</span></div>
            <div><span>Edition</span><span>№ {md.edition || "—"} · 1/1</span></div>
            <div><span>Palette</span><span>{md.palette || "—"}</span></div>
            <div><span>Shirt</span><span>{md.color} · {(md.size || "").toUpperCase()} · ×{md.qty || 1}</span></div>
            <div><span>Order ref</span><span>{sessionId.slice(0, 27)}…</span></div>
            <div>
              <span>Print lab</span>
              <span>
                {fulfill?.fulfilled
                  ? `Order ${fulfill.order?.id || ""} received (${fulfill.existing ? "already on file" : fulfill.outcome || "created"})`
                  : `Pending — ${fulfill?.reason || "unknown"}`}
              </span>
            </div>
            {status?.email && <div><span>Receipt to</span><span>{status.email}</span></div>}
          </div>
          {artSrc && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={artSrc} alt={`Artwork grown from “${md.word}”`} style={{ width: "100%", borderRadius: "10px", background: "#000" }} />
          )}
        </div>

        <p style={{ marginTop: "24px", fontSize: "13.5px" }}>
          Track it any time at <Link href={`/order/${sessionId}`} style={{ color: "var(--accent)" }}>your order page</Link>.
        </p>
      </div>
    </main>
  );
}
