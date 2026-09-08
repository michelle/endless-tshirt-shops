import { notFound } from "next/navigation";
import ShirtMockup from "@/components/ShirtMockup";
import OrderStatus from "@/components/OrderStatus";
import { orderView } from "@/lib/fulfil";
import { formatDate, encodeDesign } from "@/lib/design";
import { teeColor, accent } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(id)) notFound();
  let view;
  try { view = await orderView(id); } catch { notFound(); }
  const o = view.order;
  const tc = teeColor(o.tee);

  return (
    <main className="mx-auto max-w-5xl px-5 py-8">
      <a href="/" className="mono text-lg tracking-[0.3em]">ORRERY</a>
      <div className="mt-8 grid gap-10 md:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-2xl border border-line bg-dusk/60 p-6">
          <ShirtMockup design={o} />
        </div>
        <div>
          <p className="mono text-[11px] uppercase tracking-[0.25em] text-sun">{view.paid ? "Order confirmed" : "Order not completed"}</p>
          <h1 className="mt-3 text-3xl font-semibold">{view.paid ? "Thank you. The planets are on their way." : "Payment incomplete"}</h1>
          {view.paid && view.email && <p className="mt-2 text-sm text-mute">Receipt sent to {view.email}. Keep this page: it tracks printing and shipping.</p>}

          <div className="mt-6 grid grid-cols-2 gap-4 rounded-xl border border-line p-4 text-sm">
            <div><div className="lbl">Date</div><div className="mono">{formatDate(o.date)}</div></div>
            <div><div className="lbl">Caption</div><div>{o.caption || "—"}</div></div>
            <div><div className="lbl">Tee</div><div>{tc.label} · size {o.size.toUpperCase()} · qty {o.qty}</div></div>
            <div><div className="lbl">Style</div><div>{o.layout === "inner" ? "Inner planets" : o.pluto ? "Whole system + Pluto" : "Whole system"} · Earth in {accent(o.accent).label.toLowerCase()}</div></div>
            {view.shipTo && (
              <div className="col-span-2"><div className="lbl">Ships to</div>
                <div className="text-mute">{[view.shipTo.name, view.shipTo.line1, view.shipTo.line2, view.shipTo.city, view.shipTo.state, view.shipTo.postal, view.shipTo.country].filter(Boolean).join(", ")}</div></div>
            )}
            {typeof view.amountTotal === "number" && (
              <div className="col-span-2"><div className="lbl">Paid</div><div className="mono">{(view.amountTotal / 100).toFixed(2)} {view.currency?.toUpperCase()}</div></div>
            )}
          </div>

          <div className="mt-6"><OrderStatus initial={view} /></div>

          <p className="mt-6 text-xs text-mute">
            Want another date? <a className="text-sky underline" href={`/?d=${encodeDesign(o)}`}>Start from this design</a>.
            Order reference: <span className="mono">{id}</span>
          </p>
        </div>
      </div>
    </main>
  );
}
