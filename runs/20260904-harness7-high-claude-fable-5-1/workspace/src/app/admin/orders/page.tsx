import { stripe } from "@/lib/stripe";
import { shirtSpecFromMetadata } from "@/lib/fulfillment";
import { formatMoney, STYLES } from "@/lib/catalog";
import { isProdigiLive, prodigiBaseUrl } from "@/lib/env";

export const dynamic = "force-dynamic";

/**
 * Minimal back-office view: recent payments and their Prodigi fulfilment
 * status, read straight from PaymentIntent metadata. Protected by a shared
 * token (`?token=` or the `dts_admin` cookie) so it is safe to leave deployed.
 */
export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const expected = process.env.ADMIN_TOKEN;
  if (!expected || token !== expected) {
    return (
      <main className="page">
        <h1 style={{ fontWeight: 300 }}>Not authorised</h1>
        <p>Append <code>?token=…</code> matching <code>ADMIN_TOKEN</code>.</p>
      </main>
    );
  }
  const list = await stripe().paymentIntents.list({ limit: 50 });
  const rows = list.data.filter((pi) => pi.metadata?.timestamp);
  const dashboardBase = process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_")
    ? "https://dashboard.stripe.com/payments/"
    : "https://dashboard.stripe.com/test/payments/";
  return (
    <main className="page">
      <header className="masthead">
        <h1>datetime.store · orders</h1>
        <h2>
          Prodigi {isProdigiLive() ? "LIVE" : "sandbox"} ({prodigiBaseUrl()}) · showing {rows.length} of the last{" "}
          {list.data.length} payment intents
        </h2>
      </header>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <thead>
          <tr style={{ textAlign: "left", color: "#777", fontSize: 12, textTransform: "uppercase" }}>
            <th>Created</th>
            <th>Payment</th>
            <th>Shirt</th>
            <th>Ship to</th>
            <th>Prodigi</th>
            <th>Artwork</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((pi) => {
            const spec = shirtSpecFromMetadata(pi.metadata);
            const err = pi.metadata.fulfillment_error;
            return (
              <tr key={pi.id} style={{ borderTop: "1px solid #e5e5e5", verticalAlign: "top" }}>
                <td style={{ padding: "8px 6px 8px 0", whiteSpace: "nowrap" }}>
                  {new Date(pi.created * 1000).toLocaleString("en-US")}
                </td>
                <td style={{ padding: "8px 6px" }}>
                  <a href={`${dashboardBase}${pi.id}`} target="_blank" rel="noreferrer">
                    {pi.id}
                  </a>
                  <br />
                  {formatMoney(pi.amount, pi.currency)} · <strong>{pi.status}</strong>
                  {pi.receipt_email ? <><br />{pi.receipt_email}</> : null}
                </td>
                <td style={{ padding: "8px 6px" }}>
                  {spec ? (
                    <>
                      <span style={{ fontFamily: "Chivo, sans-serif" }}>{spec.timestamp}</span>
                      <br />
                      {STYLES[spec.style].label} · {spec.size} · black
                    </>
                  ) : (
                    "—"
                  )}
                </td>
                <td style={{ padding: "8px 6px" }}>
                  {pi.shipping?.name}
                  <br />
                  {[pi.shipping?.address?.city, pi.shipping?.address?.state, pi.shipping?.address?.country]
                    .filter(Boolean)
                    .join(", ")}
                </td>
                <td style={{ padding: "8px 6px" }}>
                  {pi.metadata.prodigi_order_id ? (
                    <>
                      {pi.metadata.prodigi_order_id}
                      <br />
                      {pi.metadata.prodigi_stage} ({pi.metadata.prodigi_env})
                      {pi.metadata.tracking_url ? (
                        <>
                          <br />
                          <a href={pi.metadata.tracking_url}>track</a>
                        </>
                      ) : null}
                    </>
                  ) : pi.status === "succeeded" ? (
                    <span style={{ color: "#eb1c26" }}>NOT FULFILLED{err ? `: ${err}` : ""}</span>
                  ) : (
                    "—"
                  )}
                </td>
                <td style={{ padding: "8px 6px" }}>
                  {spec ? (
                    <a href={`/api/artwork/${spec.timestamp}.png?style=${spec.style}&preview=1`} target="_blank" rel="noreferrer">
                      preview
                    </a>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </main>
  );
}
