import Link from "next/link";
import { listOrders } from "@/lib/orders";
import { getGarment } from "@/lib/catalog";
import { RetryButton } from "./RetryButton";

export const dynamic = "force-dynamic";

function authorised(token: string | undefined): boolean {
  const expected = process.env.ADMIN_TOKEN;
  return Boolean(expected) && token === expected;
}

export default async function AdminPage({ searchParams }: PageProps<"/admin">) {
  const sp = await searchParams;
  const token = typeof sp.token === "string" ? sp.token : undefined;
  if (!authorised(token)) {
    return (
      <div className="mx-auto max-w-md px-5 py-16">
        <h1 className="font-display text-3xl text-star">Admin</h1>
        <form className="mt-6 flex gap-2" method="get">
          <input name="token" type="password" placeholder="Admin token" className="field" />
          <button className="btn-primary">Enter</button>
        </form>
      </div>
    );
  }

  const orders = await listOrders(200);
  const stripeBase = process.env.STRIPE_SECRET_KEY?.includes("_test_") ? "https://dashboard.stripe.com/test" : "https://dashboard.stripe.com";

  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <div className="mb-6 flex items-baseline justify-between">
        <h1 className="font-display text-3xl text-star">Orders</h1>
        <span className="font-mono text-xs text-mist">{orders.length} total</span>
      </div>
      <div className="overflow-x-auto rounded-lg border border-line">
        <table className="w-full text-left text-xs">
          <thead className="bg-panel font-mono uppercase text-mist">
            <tr>
              {["When", "Customer", "Design", "Shirt", "Total", "Status", "Prodigi", "Links"].map((h) => (
                <th key={h} className="px-3 py-2 font-normal">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-t border-line align-top">
                <td className="px-3 py-2 font-mono text-mist">{o.createdAt.slice(0, 16).replace("T", " ")}</td>
                <td className="px-3 py-2">
                  {o.customerName}
                  <br />
                  <span className="text-mist">{o.email}</span> · {o.country}
                </td>
                <td className="px-3 py-2">
                  <em className="font-display text-base">{o.design.title || "—"}</em>
                  <br />
                  <span className="text-mist">{o.design.place} · {o.design.date} {o.design.time}</span>
                </td>
                <td className="px-3 py-2">
                  {o.quantity} × {getGarment(o.design.garment).label} / {o.size.toUpperCase()}
                  <br />
                  <span className="text-mist">{o.design.style}{o.design.color ? ", colour" : ", mono"} · {o.shippingMethod}</span>
                </td>
                <td className="px-3 py-2 font-mono">{(o.amountTotal / 100).toFixed(2)} {o.currency.toUpperCase()}</td>
                <td className="px-3 py-2">
                  <span className={o.status === "submitted" ? "text-green-400" : o.status === "failed" ? "text-red-400" : "text-amber-400"}>{o.status}</span>
                  {o.error && <p className="mt-1 max-w-56 text-red-400">{o.error}</p>}
                  {o.status !== "submitted" && <RetryButton id={o.id} token={token!} />}
                </td>
                <td className="px-3 py-2 font-mono">{o.prodigiOrderId ?? "—"}<br /><span className="text-mist">{o.prodigiOutcome}</span></td>
                <td className="px-3 py-2 space-x-2">
                  <Link className="underline" href={`/order/${o.id}`}>status</Link>
                  {o.printUrl && <a className="underline" href={o.printUrl} target="_blank" rel="noreferrer">print</a>}
                  {o.paymentIntentId && <a className="underline" href={`${stripeBase}/payments/${o.paymentIntentId}`} target="_blank" rel="noreferrer">stripe</a>}
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr><td colSpan={8} className="px-3 py-8 text-center text-mist">No orders yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
