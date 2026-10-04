import { listProdigiOrders, prodigiIsSandbox } from "@/lib/prodigi";

export const dynamic = "force-dynamic";

export default async function AdminPage({ searchParams }: PageProps<"/admin">) {
  const sp = await searchParams;
  const key = typeof sp.key === "string" ? sp.key : "";
  if (!process.env.ADMIN_KEY || key !== process.env.ADMIN_KEY) {
    return <main className="p-10 text-dim">Not authorised.</main>;
  }
  const orders = await listProdigiOrders(30);
  return (
    <main className="mx-auto w-full max-w-5xl p-6 sm:p-10">
      <h1 className="serif text-3xl">Fulfilment · Prodigi {prodigiIsSandbox() ? "sandbox" : "LIVE"}</h1>
      <p className="mt-2 text-sm text-dim">{orders.length} most recent orders, newest first.</p>
      <div className="mt-6 overflow-x-auto rounded-lg border border-line">
        <table className="w-full text-sm">
          <thead className="bg-panel text-left text-dim">
            <tr>
              <th className="p-3">Prodigi ID</th><th className="p-3">Created</th><th className="p-3">Stage</th>
              <th className="p-3">Item</th><th className="p-3">Ship to</th><th className="p-3">Stripe session</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-t border-line align-top">
                <td className="p-3 font-mono text-xs">{o.id}</td>
                <td className="p-3 whitespace-nowrap">{new Date(o.created).toLocaleString("en-US")}</td>
                <td className="p-3">
                  {o.status.stage}
                  {o.status.issues?.length ? <div className="text-red-400 text-xs">{o.status.issues.map((i) => i.description).join("; ")}</div> : null}
                </td>
                <td className="p-3">{o.items.map((i) => `${i.copies}× ${i.attributes.color} / ${i.attributes.size}`).join(", ")}</td>
                <td className="p-3">{o.recipient.name}, {o.recipient.address.townOrCity}, {o.recipient.address.countryCode}</td>
                <td className="p-3">
                  {o.merchantReference ? <a className="underline" href={`/order/${o.merchantReference}`}>{o.merchantReference.slice(0, 18)}…</a> : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
