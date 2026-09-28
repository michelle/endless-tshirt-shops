import Link from "next/link";
import { Poller } from "./poller";

export const dynamic = "force-dynamic";

interface SuccessPageProps {
  searchParams?: { session_id?: string; order_id?: string; demo?: string };
}

export default function Success({ searchParams }: SuccessPageProps) {
  const sessionId = searchParams?.session_id ?? "(unknown)";
  const orderId = searchParams?.order_id ?? "";
  const demo = searchParams?.demo === "1";

  return (
    <div className="success-card">
      <h1>Order received.</h1>
      <p style={{ color: "var(--soft)", maxWidth: 620, marginTop: 10 }}>
        Your shirt is being engraved. We'll pull the design at the moment
        we receive your payment, and the print lab nearest you will lay
        it onto the cotton, cure it, and ship it on.
      </p>

      <div className="banner good" style={{ marginTop: 22 }}>
        Payment confirmed{" "}
        {demo && <span style={{ color: "var(--soft)" }}>(demo mode)</span>}
      </div>

      <table style={{
        marginTop: 22,
        width: "100%",
        borderCollapse: "collapse",
        color: "var(--ink)",
        fontSize: 15,
      }}>
        <tbody>
          <tr>
            <td className="status-line" style={{ padding: "10px 0", width: 210, color: "var(--soft)" }}>
              Stripe session
            </td>
            <td className="status-line" style={{ fontFamily: "'Courier New', monospace" }}>{sessionId}</td>
          </tr>
          {orderId && <tr>
            <td className="status-line" style={{ padding: "10px 0", color: "var(--soft)" }}>
              Prodigi order
            </td>
            <td className="status-line" style={{ fontFamily: "'Courier New', monospace" }}>
              {orderId} <a href={`https://sandbox-beta-dashboard.pwinty.com/orders/${orderId}`} target="_blank" rel="noreferrer">↗ dashboard</a>
            </td>
          </tr>}
        </tbody>
      </table>

      <Poller sessionId={sessionId} />

      <div style={{ marginTop: 32, fontStyle: "italic", color: "var(--soft)", fontSize: 15 }}>
        Watch the status update below — Prodigi moves through <em>Download assets</em>, <em>Production</em> and <em>Shipping</em>.
        You'll get an email with tracking when it ships. (<Link href="/">make another →</Link>)
      </div>
    </div>
  );
}
