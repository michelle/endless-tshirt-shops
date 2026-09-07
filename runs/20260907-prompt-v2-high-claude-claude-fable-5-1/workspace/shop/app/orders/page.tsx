import { redirect } from "next/navigation";

export const metadata = { title: "Track an order — The Obsolete Guild" };

async function lookup(formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "").trim();
  if (id) redirect(`/orders/${encodeURIComponent(id)}`);
}

export default function OrdersPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-16 sm:px-6">
      <h1 className="font-display text-3xl">Track an order</h1>
      <p className="mt-3 text-ink/75">Enter the order number from your confirmation page (it starts with <span className="font-mono">ord_</span>).</p>
      <form action={lookup} className="mt-6 flex gap-3">
        <input name="id" placeholder="ord_…" required className="font-mono" />
        <button className="btn shrink-0">Look up</button>
      </form>
    </div>
  );
}
