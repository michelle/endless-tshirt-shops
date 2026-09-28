import { Poller } from "../success/poller";

export const dynamic = "force-dynamic";

interface OrderPageProps {
  searchParams?: { session_id?: string };
}

export default function OrderPage({ searchParams }: OrderPageProps) {
  const sessionId = searchParams?.session_id;
  return (
    <div className="success-card">
      <h1>Track an order</h1>
      {sessionId ? (
        <>
          <p style={{ color: "var(--soft)" }}>
            Polling Prodigi for the production status of{" "}
            <code style={{ fontFamily: "'Courier New', monospace" }}>{sessionId}</code>.
          </p>
          <Poller sessionId={sessionId} />
        </>
      ) : (
        <>
          <p style={{ color: "var(--soft)" }}>
            Paste the order id from your receipt into the box and we'll pull
            the current Prodigi status. (You'll get this id emailed once we
            submit your payment — see the success page after checkout.)
          </p>
          <form
            method="GET"
            action="/order"
            style={{ marginTop: 18, display: "flex", gap: 8, maxWidth: 540 }}
          >
            <input
              type="text"
              name="session_id"
              placeholder="cs_test_... or ord_..."
              style={{
                flex: 1,
                background: "rgba(0,0,0,.3)",
                color: "var(--ink)",
                border: "1px solid var(--line)",
                borderRadius: 8,
                padding: "11px 14px",
                fontFamily: "'Courier New', monospace",
                fontSize: 14,
              }}
            />
            <button className="pay-btn" type="submit">Track</button>
          </form>
        </>
      )}
    </div>
  );
}
