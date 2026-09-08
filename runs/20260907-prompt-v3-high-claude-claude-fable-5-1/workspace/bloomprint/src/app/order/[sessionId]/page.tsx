"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { generatePlantSvg } from "@/lib/botanical/generator";
import { Design, toPlantInput } from "@/lib/design";
import { garmentByKey } from "@/lib/catalog";
import { ShirtMockup } from "@/components/ShirtMockup";

interface OrderStatus {
  id: string;
  paymentStatus: string;
  status: string;
  amountTotal: number | null;
  currency: string | null;
  email: string | null;
  shipping: { name?: string | null; address?: { line1?: string | null; line2?: string | null; city?: string | null; state?: string | null; postal_code?: string | null; country?: string | null } | null } | null;
  design: Design | null;
  size: string | null;
  quantity: number;
  label: { genus: string; species: string; specimenNo: string } | null;
  fulfillment: {
    prodigiOrderId: string;
    sandbox: boolean;
    stage: string;
    shipments: { carrier: string | null; tracking: { number: string; url: string } | null; dispatchDate: string | null }[];
  } | null;
  error?: string;
}

const STAGE_COPY: Record<string, string> = {
  InProgress: "Received by the print lab. Your plate is being prepared for printing.",
  Complete: "Printed and shipped.",
  Cancelled: "Cancelled.",
  Draft: "Waiting at the print lab.",
  AwaitingPayment: "Waiting at the print lab.",
};

export default function OrderPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = use(params);
  const [order, setOrder] = useState<OrderStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let tries = 0;
    async function load() {
      try {
        const res = await fetch(`/api/orders/${sessionId}`, { cache: "no-store" });
        const data = (await res.json()) as OrderStatus;
        if (cancelled) return;
        if (!res.ok) throw new Error(data.error || "Could not load order");
        setOrder(data);
        if (!data.fulfillment && data.paymentStatus === "paid" && tries++ < 10) setTimeout(load, 3000);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const svg = useMemo(() => (order?.design ? generatePlantSvg(toPlantInput(order.design)).svg : null), [order?.design]);

  if (error) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-16 text-center">
        <h1 className="font-display text-3xl font-semibold">We couldn&apos;t find that order</h1>
        <p className="mt-2 text-ink-soft">{error}</p>
        <Link href="/design" className="btn-primary mt-6">
          Back to the studio
        </Link>
      </main>
    );
  }
  if (!order) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-24 text-center text-ink-soft">
        <p className="font-display text-2xl italic">Checking on your order…</p>
      </main>
    );
  }

  const paid = order.paymentStatus === "paid";
  const garment = order.design ? garmentByKey(order.design.garment) : undefined;
  const addr = order.shipping?.address;

  return (
    <main className="mx-auto max-w-5xl px-5 py-10">
      <div className="grid gap-10 md:grid-cols-[360px_1fr]">
        <div>{svg && garment && <ShirtMockup svg={svg} hex={garment.hex} className="w-full" />}</div>
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-moss">{paid ? "Order confirmed" : "Payment pending"}</p>
          <h1 className="mt-2 font-display text-4xl font-semibold">
            {paid ? "Thank you. Your specimen is on its way to print." : "We're waiting for your payment to clear."}
          </h1>
          {order.label && (
            <p className="mt-3 font-display text-2xl italic">
              {order.label.genus} {order.label.species} <span className="text-base not-italic text-ink-soft">No. {order.label.specimenNo}</span>
            </p>
          )}

          <dl className="mt-8 grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="label">Shirt</dt>
              <dd>
                {garment?.label} · size {order.size?.toUpperCase()} · qty {order.quantity}
              </dd>
            </div>
            <div>
              <dt className="label">Paid</dt>
              <dd>
                {order.amountTotal != null ? `${(order.amountTotal / 100).toFixed(2)} ${order.currency?.toUpperCase()}` : "—"}
                {order.email ? ` · receipt sent to ${order.email}` : ""}
              </dd>
            </div>
            {addr && (
              <div>
                <dt className="label">Shipping to</dt>
                <dd>
                  {order.shipping?.name}
                  <br />
                  {addr.line1}
                  {addr.line2 ? <>, {addr.line2}</> : null}
                  <br />
                  {addr.city}
                  {addr.state ? `, ${addr.state}` : ""} {addr.postal_code}
                  <br />
                  {addr.country}
                </dd>
              </div>
            )}
            <div>
              <dt className="label">Print status</dt>
              <dd>
                {order.fulfillment ? (
                  <>
                    {STAGE_COPY[order.fulfillment.stage] ?? order.fulfillment.stage}
                    <br />
                    <span className="text-xs text-ink-soft">
                      Print order {order.fulfillment.prodigiOrderId}
                      {order.fulfillment.sandbox ? " (sandbox: no physical shirt will ship)" : ""}
                    </span>
                    {order.fulfillment.shipments.map((sh, i) =>
                      sh.tracking ? (
                        <div key={i} className="mt-1 text-xs">
                          Tracking: {" "}
                          <a className="underline" href={sh.tracking.url} target="_blank" rel="noreferrer">
                            {sh.tracking.number}
                          </a>{" "}
                          ({sh.carrier})
                        </div>
                      ) : null,
                    )}
                  </>
                ) : paid ? (
                  <span className="text-ink-soft">Sending to the print lab…</span>
                ) : (
                  <span className="text-ink-soft">Nothing is printed until payment succeeds.</span>
                )}
              </dd>
            </div>
          </dl>

          <p className="mt-8 text-xs text-ink-soft">
            Keep this link to check on your order: <span className="break-all">{typeof window !== "undefined" ? window.location.href : ""}</span>
          </p>
          <Link href="/design" className="btn-secondary mt-6">
            Grow another
          </Link>
        </div>
      </div>
    </main>
  );
}
