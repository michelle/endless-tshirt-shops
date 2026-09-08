import { redirect } from "next/navigation";

export const metadata = { title: "Track an order" };

async function lookup(formData: FormData) {
  "use server";
  const id = String(formData.get("id") || "").trim();
  redirect(`/order/${encodeURIComponent(id)}`);
}

export default function TrackPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <h1 className="font-slab text-4xl">Track an order</h1>
      <p className="mt-2 text-ink-2 text-sm">Enter the order number from your confirmation page (it looks like ord_123456).</p>
      <form action={lookup} className="mt-6 flex gap-3">
        <input name="id" required placeholder="ord_123456" className="flex-1 border-3 border-ink bg-paper px-3 py-2" />
        <button className="btn" type="submit">
          Look up
        </button>
      </form>
    </div>
  );
}
