import { getOrder } from "@/lib/prodigi";
import { stripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export default async function OrderPage({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const params = await searchParams;
  const sessionId = params.session_id || "";
  if (!sessionId.startsWith("cs_")) {
    return <div className="panel"><h1>No order to show.</h1></div>;
  }
  const session = await stripe().checkout.sessions.retrieve(sessionId);
  const prodigiOrderId = session.metadata?.prodigiOrderId;
  const order = prodigiOrderId ? await getOrder(prodigiOrderId).catch(() => null) : null;
  return (
    <div className="panel">
      <div className="success-card">
        <p className="eyebrow">Order</p>
        <h1>{session.payment_status === "paid" ? "Paid." : "Not paid."}</h1>
        <p className="mono">Payment {session.id} · {session.payment_status}</p>
        {order ? (
          <>
            <p className="mono">Print order {order.id}</p>
            <p className="mono">Stage {order.stage}</p>
            {order.issues.length > 0 && <p className="error">{order.issues.join(" ")}</p>}
            {order.shipments.map((s, i) => (
              <p key={i}>{s.status} {s.carrier} {s.tracking}</p>
            ))}
          </>
        ) : (
          <p>No print order yet. If you just paid, go back to the confirmation page and retry.</p>
        )}
        <div className="row-actions">
          <a className="ghost" href={`/success?session_id=${encodeURIComponent(sessionId)}`}>Confirmation</a>
          <a className="primary" href="/">Studio</a>
        </div>
      </div>
    </div>
  );
}
