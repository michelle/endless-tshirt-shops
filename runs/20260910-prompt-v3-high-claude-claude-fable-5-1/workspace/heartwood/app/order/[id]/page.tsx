import Link from "next/link";
import { notFound } from "next/navigation";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { fulfillCheckoutSession, lookupProdigi, FulfillResult } from "@/lib/fulfill";
import { describeStage, prodigiIsSandbox, ProdigiOrder } from "@/lib/prodigi";
import { getChunked, verifyDesignToken } from "@/lib/token";
import { encodeDesignParam, renderRings } from "@/lib/rings";
import { findColor, formatMoney } from "@/lib/catalog";
import { RingArt } from "@/components/RingArt";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function OrderPage({ params }: PageProps<"/order/[id]">) {
  const { id } = await params;
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(id)) notFound();

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe().checkout.sessions.retrieve(id, { expand: ["payment_intent"] });
  } catch {
    notFound();
  }

  const meta = session.metadata ?? {};
  const color = findColor(meta.color ?? "") ?? findColor("black")!;
  const token = getChunked(meta, "d");
  let art: string | null = null;
  let designParam: string | null = null;
  let rings = 0;
  if (token) {
    try {
      const design = verifyDesignToken(token);
      const r = renderRings(design, { onDark: color.dark, id: "order" });
      art = r.svg;
      rings = r.rings;
      designParam = encodeDesignParam(design);
    } catch {
      art = null;
    }
  }

  const paid = session.payment_status === "paid";
  let fulfil: FulfillResult | null = null;
  let prodigi: ProdigiOrder | null = null;
  if (paid) {
    try {
      fulfil = await fulfillCheckoutSession(id);
    } catch (e) {
      fulfil = { status: "error", message: (e as Error).message };
    }
    if (fulfil.status === "fulfilled") prodigi = await lookupProdigi(fulfil.prodigiOrderId);
  }

  const ship = session.collected_information?.shipping_details ?? null;
  const email = session.customer_details?.email ?? null;
  const total = session.amount_total ?? 0;
  const stage = prodigi ? describeStage(prodigi) : null;
  const details = prodigi?.status.details ?? {};
  const steps = [
    { key: "paid", label: "Payment received", done: paid },
    { key: "sent", label: "Order sent to the print lab", done: !!prodigi },
    { key: "prep", label: "Lab prepared the print file", done: details.printReadyAssetsPrepared === "Complete", now: details.downloadAssets === "InProgress" || details.printReadyAssetsPrepared === "InProgress" },
    { key: "print", label: "Printing", done: details.inProduction === "Complete", now: details.inProduction === "InProgress" },
    { key: "ship", label: "Shipped", done: details.shipping === "Complete" || prodigi?.status.stage === "Complete", now: details.shipping === "InProgress" },
  ];
  const nowIdx = steps.findIndex((s) => !s.done);

  return (
    <main className="wrap order">
      {!paid ? (
        <>
          <div className="eyebrow" style={{ color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.18em", fontSize: "0.78rem", fontWeight: 600 }}>Order</div>
          <h1>Payment not completed</h1>
          <p style={{ color: "var(--ink-2)" }}>
            This checkout is {session.status === "expired" ? "expired" : "still open"}. Nothing has been charged and nothing has been sent to print.
          </p>
          {designParam && (
            <Link className="btn accent" href={`/design?d=${designParam}&c=${encodeURIComponent(color.key)}&s=${meta.size ?? "m"}`}>
              Back to your design
            </Link>
          )}
        </>
      ) : (
        <>
          <div style={{ color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.18em", fontSize: "0.78rem", fontWeight: 600, marginBottom: 10 }}>Thank you</div>
          <h1>Your rings are on their way to the press.</h1>
          <p style={{ color: "var(--ink-2)" }}>
            {email ? `A receipt has gone to ${email}. ` : ""}Bookmark this page to follow your order. It updates live from the print lab.
          </p>
          <div className="status">
            <div>
              {art ? <RingArt svg={art} className="art" style={{ background: color.hex }} /> : <p className="notice">Design preview unavailable.</p>}
              <dl className="kv">
                <dt>Shirt</dt>
                <dd>{color.label} · {(meta.size ?? "").toUpperCase()} · qty {meta.quantity ?? 1}</dd>
                <dt>Rings</dt>
                <dd>{rings || meta.rings}</dd>
                <dt>Paid</dt>
                <dd>{formatMoney(total)}</dd>
                {ship?.address && (
                  <>
                    <dt>Ship to</dt>
                    <dd>{ship.name}, {[ship.address.city, ship.address.country].filter(Boolean).join(", ")}</dd>
                  </>
                )}
                <dt>Order ref</dt>
                <dd style={{ fontSize: "0.8rem", wordBreak: "break-all" }}>{prodigi?.id ?? id}</dd>
              </dl>
            </div>
            <div>
              <p className="stage-title">{stage ? stage.title : fulfil?.status === "error" ? "Preparing" : "Sending to the lab"}</p>
              <p style={{ color: "var(--ink-2)", margin: 0 }}>
                {stage ? stage.detail : fulfil?.status === "error" ? "Payment is confirmed. We hit a snag handing the order to the print lab; it will be retried automatically." : "One moment while we hand your print file to the lab."}
              </p>
              <ul className="timeline">
                {steps.map((s, i) => (
                  <li key={s.key} className={s.done ? "done" : s.now || i === nowIdx ? "now" : ""}>
                    <i /> {s.label}
                  </li>
                ))}
              </ul>
              {prodigi?.shipments?.map((sh) => (
                <p key={sh.id} className="notice">
                  Shipped via {sh.carrier?.name ?? "carrier"}
                  {sh.tracking?.url ? (
                    <>
                      {" "}· <a href={sh.tracking.url}>Track package</a>
                    </>
                  ) : sh.tracking?.number ? ` · tracking ${sh.tracking.number}` : ""}
                </p>
              ))}
              {prodigi?.status.issues?.length ? (
                <p className="notice">The lab flagged: {prodigi.status.issues.map((i) => i.description).join("; ")}</p>
              ) : null}
              {prodigiIsSandbox() && (
                <p className="notice">
                  <b>Test mode.</b> This order went to the Prodigi sandbox, so it won&apos;t actually be printed or shipped, and the payment used a Stripe test card.
                </p>
              )}
              {fulfil?.status === "error" && <p className="notice">Detail: {fulfil.message}</p>}
              <p style={{ marginTop: 18 }}>
                <Link href="/design" className="btn ghost">
                  Grow another
                </Link>
              </p>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
