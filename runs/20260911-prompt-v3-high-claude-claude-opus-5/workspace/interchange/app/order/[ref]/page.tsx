"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import { Foot, Nav } from "@/components/Chrome";
import { Tee } from "@/components/Tee";
import { GARMENTS, SIZE_LABELS, Spec } from "@/lib/spec";

type OrderView = {
  ref: string;
  found: boolean;
  paymentNote?: string | null;
  prodigiOrderId?: string;
  created?: string;
  stage?: { label: string; detail: string; done: boolean };
  rawStage?: string;
  details?: Record<string, string>;
  issues?: { errorCode: string; description: string }[];
  shippingMethod?: string;
  recipient?: { name: string; city: string; country: string };
  item?: { sku: string; copies: number; attributes: Record<string, string>; assetStatus: { printArea: string; status: string }[] };
  shipments?: { carrier: string | null; service: string | null; tracking: string | null; trackingUrl: string | null; dispatchDate: string | null }[];
  artToken?: string | null;
  spec?: Spec | null;
};

const STEPS = [
  ["Received", "We have your order and your artwork."],
  ["Preparing print file", "Your map is being turned into a press-ready file."],
  ["In production", "Ink is going onto cotton."],
  ["Shipped", "On its way to you."],
];

export default function OrderPage({
  params, searchParams,
}: {
  params: Promise<{ ref: string }>;
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { ref } = use(params);
  const { session_id } = use(searchParams);
  const [data, setData] = useState<OrderView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tries, setTries] = useState(0);

  const load = useCallback(async () => {
    try {
      const qs = session_id ? `?session_id=${encodeURIComponent(session_id)}` : "";
      const res = await fetch(`/api/order/${encodeURIComponent(ref)}${qs}`, { cache: "no-store" });
      if (!res.ok) throw new Error(await res.text());
      setData(await res.json());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setTries((n) => n + 1);
    }
  }, [ref, session_id]);

  useEffect(() => { load(); }, [load]);

  // Prodigi takes a few seconds to pick the artwork up; keep looking briefly.
  useEffect(() => {
    if (data?.found && data.stage?.done) return;
    if (tries > 20) return;
    const timer = setTimeout(load, data?.found ? 8000 : 3000);
    return () => clearTimeout(timer);
  }, [data, tries, load]);

  const stageIndex = data?.stage ? STEPS.findIndex((s) => s[0] === data.stage!.label) : -1;
  const spec = data?.spec;

  return (
    <>
      <Nav />
      <main className="wrap" style={{ paddingBottom: 40 }}>
        <div className="checkout">
          <div>
            <p className="eyebrow" style={{ marginTop: 34 }}>Order {ref}</p>
            {!data && !error && <h2>Looking up your order&hellip;</h2>}

            {data && !data.found && (
              <>
                <h2>We have not received this order yet.</h2>
                <p className="notice">
                  {data.paymentNote || "If you have just paid, this page will update on its own within a few seconds."}
                </p>
              </>
            )}

            {data?.found && (
              <>
                <h2>{data.stage?.label}</h2>
                <p className="lede" style={{ marginTop: 0 }}>{data.stage?.detail}</p>

                <ul className="track" style={{ marginTop: 26 }}>
                  {STEPS.map(([label, detail], i) => {
                    const cls = i < stageIndex ? "done" : i === stageIndex ? "now" : "";
                    return (
                      <li key={label} className={cls}>
                        <span className="bullet" />
                        <span>
                          <b>{label}</b>
                          <span>{detail}</span>
                        </span>
                      </li>
                    );
                  })}
                </ul>

                {!!data.issues?.length && (
                  <div className="notice err" style={{ marginTop: 18 }}>
                    <strong>The print partner flagged something:</strong>
                    <ul style={{ margin: "8px 0 0 18px", padding: 0 }}>
                      {data.issues.map((i, n) => <li key={n}>{i.description}</li>)}
                    </ul>
                  </div>
                )}

                {!!data.shipments?.length && data.shipments[0].tracking && (
                  <div className="notice ok" style={{ marginTop: 18 }}>
                    Shipped with {data.shipments[0].carrier} ({data.shipments[0].service}).{" "}
                    {data.shipments[0].trackingUrl ? (
                      <a href={data.shipments[0].trackingUrl} target="_blank" rel="noreferrer">
                        Track {data.shipments[0].tracking}
                      </a>
                    ) : `Tracking ${data.shipments[0].tracking}`}
                  </div>
                )}

                <hr className="hr" style={{ margin: "28px 0" }} />
                <table className="summary">
                  <tbody>
                    <tr><td>Print reference</td><td>{data.prodigiOrderId}</td></tr>
                    <tr><td>Placed</td><td>{data.created ? new Date(data.created).toLocaleString() : "-"}</td></tr>
                    <tr><td>Shipping</td><td>{data.shippingMethod}</td></tr>
                    <tr><td>Ships to</td><td>{data.recipient?.name} &middot; {data.recipient?.city}, {data.recipient?.country}</td></tr>
                    {data.item && (
                      <tr><td>Item</td><td>{data.item.copies} &times; {data.item.attributes.color} / {SIZE_LABELS[data.item.attributes.size as keyof typeof SIZE_LABELS] || data.item.attributes.size}</td></tr>
                    )}
                    {data.item && (
                      <tr><td>Artwork</td><td>{data.item.assetStatus.map((a) => `${a.printArea}: ${a.status}`).join(" · ")}</td></tr>
                    )}
                  </tbody>
                </table>

                {data.artToken && (
                  <p style={{ marginTop: 18 }}>
                    <a className="btn ghost sm" href={`/api/art/${data.artToken}.png`} target="_blank" rel="noreferrer">
                      Download the print file
                    </a>
                  </p>
                )}
              </>
            )}

            {error && <p className="notice err">{error}</p>}

            <p className="muted" style={{ marginTop: 30 }}>
              Bookmark this page &mdash; it is the live status of your order.{" "}
              <Link href="/design">Make another map</Link>.
            </p>
          </div>

          <aside>
            {spec && (
              <div className="card">
                <div style={{ maxWidth: 240, margin: "0 auto 16px" }}>
                  <Tee color={GARMENTS[spec.garment]?.hex || "#16171b"}>
                    {data?.artToken && <img src={`/api/art/${data.artToken}.png?screen=1`} alt={spec.title} />}
                  </Tee>
                </div>
                <h3 style={{ textAlign: "center" }}>{spec.title}</h3>
                <p className="muted" style={{ textAlign: "center", margin: 0 }}>{spec.subtitle}</p>
              </div>
            )}
          </aside>
        </div>
      </main>
      <Foot />
    </>
  );
}
