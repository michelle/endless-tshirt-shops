import Link from "next/link";
import type { ProdigiOrder } from "@/lib/prodigi";
import { getDesign, getColor } from "@/lib/catalog";
import { ShirtMockup } from "./ShirtMockup";

const STAGES: Record<string, { label: string; blurb: string }> = {
  InProgress: { label: "In production", blurb: "The lab has your order. Printing usually takes 2–4 working days." },
  Complete: { label: "Shipped", blurb: "Your shirts are on their way." },
  Cancelled: { label: "Cancelled", blurb: "This order was cancelled." },
  Draft: { label: "Draft", blurb: "This order is awaiting confirmation." },
  AwaitingPayment: { label: "Awaiting payment", blurb: "This order is awaiting payment." },
  OnHold: { label: "On hold", blurb: "This order needs attention before it can be printed." },
};

const ITEM_STATUS: Record<string, string> = {
  NotYetDownloaded: "Queued",
  Ok: "Ready to print",
  Invalid: "Needs attention",
  Cancelled: "Cancelled",
};

export function OrderStatus({ order, isNew, reference }: { order: ProdigiOrder; isNew?: boolean; reference?: string }) {
  const stage = STAGES[order.status.stage] ?? { label: order.status.stage, blurb: "" };
  const a = order.recipient.address;
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      {isNew ? (
        <>
          <div className="font-mono text-xs uppercase tracking-[0.3em] text-rust">Order confirmed</div>
          <h1 className="mt-2 font-display text-3xl sm:text-4xl">Thank you, {order.recipient.name.split(" ")[0]}.</h1>
          <p className="mt-3 text-ink/80">
            Your badge is going to the press. Keep this order number to track it: <span className="font-mono font-medium">{order.id}</span>
            {reference ? <> (reference <span className="font-mono">{reference}</span>)</> : null}.
          </p>
        </>
      ) : (
        <>
          <div className="font-mono text-xs uppercase tracking-[0.3em] text-ink/60">Order {order.id}</div>
          <h1 className="mt-2 font-display text-3xl">{stage.label}</h1>
        </>
      )}

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <div className="rounded-lg border border-ink/15 bg-paper-2/60 p-5">
          <div className="font-mono text-xs uppercase tracking-widest text-ink/60">Status</div>
          <div className="mt-1 text-lg font-medium">{stage.label}</div>
          <p className="mt-1 text-sm text-ink/75">{stage.blurb}</p>
          {order.status.issues && order.status.issues.length > 0 && (
            <ul className="mt-2 list-disc pl-5 text-sm text-rust">
              {order.status.issues.map((i, k) => <li key={k}>{i.description}</li>)}
            </ul>
          )}
          {order.shipments?.some((s) => s.tracking?.number) && (
            <div className="mt-3 text-sm">
              {order.shipments.map((s, k) =>
                s.tracking?.number ? (
                  <div key={k}>
                    {s.carrier?.name} tracking:{" "}
                    {s.tracking.url ? <a href={s.tracking.url} className="underline" target="_blank" rel="noreferrer">{s.tracking.number}</a> : s.tracking.number}
                  </div>
                ) : null
              )}
            </div>
          )}
          <div className="mt-3 text-xs text-ink/60">Placed {new Date(order.created).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</div>
        </div>
        <div className="rounded-lg border border-ink/15 bg-paper-2/60 p-5">
          <div className="font-mono text-xs uppercase tracking-widest text-ink/60">Shipping to</div>
          <address className="mt-1 text-sm not-italic leading-relaxed">
            {order.recipient.name}<br />{a.line1}<br />{a.line2 && <>{a.line2}<br /></>}{a.townOrCity}{a.stateOrCounty ? `, ${a.stateOrCounty}` : ""} {a.postalOrZipCode}<br />{a.countryCode}
          </address>
          <div className="mt-2 text-xs text-ink/60">{order.shippingMethod} shipping</div>
        </div>
      </div>

      <h2 className="mt-10 font-display text-xl">Items</h2>
      <ul className="mt-3 divide-y divide-ink/15">
        {order.items.map((it, k) => {
          const [slug, colorId] = (it.merchantReference ?? "").split(":");
          const d = slug ? getDesign(slug) : undefined;
          const c = colorId ? getColor(colorId) : undefined;
          return (
            <li key={k} className="flex items-center gap-4 py-4">
              {d && c ? (
                <div className="w-20 shrink-0 rounded border border-ink/10 bg-paper-2/60 p-1"><ShirtMockup slug={d.slug} color={c} /></div>
              ) : null}
              <div className="flex-1">
                <div className="font-medium">{d?.name ?? it.sku}</div>
                <div className="text-sm text-ink/70">{c?.label ?? it.attributes.color} · size {String(it.attributes.size).toUpperCase()} · qty {it.copies}</div>
              </div>
              {it.status && <div className="font-mono text-xs uppercase tracking-widest text-ink/60">{ITEM_STATUS[it.status] ?? it.status}</div>}
            </li>
          );
        })}
      </ul>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link href="/#shirts" className="btn-outline">Back to the shop</Link>
        <Link href={`/orders/${order.id}`} className="text-sm underline self-center">Refresh status</Link>
      </div>
    </div>
  );
}
