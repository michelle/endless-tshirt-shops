import Link from "next/link";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { fulfillSession } from "@/lib/fulfill";
import { getProdigiOrder, ProdigiOrder } from "@/lib/prodigi";
import { decodeSpec } from "@/lib/spec";
import { generateCryptid } from "@/lib/genome";
import { renderPlate } from "@/lib/art/plate";
import { colorById, sizeById, formatUsd } from "@/lib/catalog";
import { previewUrl } from "@/lib/order";
import { siteUrl } from "@/lib/stripe";
import { TeeMockup } from "@/components/TeeMockup";

export const dynamic = "force-dynamic";

const STAGE_LABELS: Record<string, string> = {
  downloadAssets: "Artwork received",
  printReadyAssetsPrepared: "Print file prepared",
  allocateProductionLocation: "Assigned to a print lab",
  inProduction: "On the press",
  shipping: "Shipped",
};

function stageState(v: string | undefined) {
  if (v === "Complete") return { cls: "pill good", text: "Done" };
  if (v === "InProgress") return { cls: "pill", text: "In progress" };
  if (v === "Error") return { cls: "pill warn", text: "Needs attention" };
  return { cls: "pill", text: "Waiting" };
}

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe().checkout.sessions.retrieve(id, { expand: ["payment_intent"] });
  } catch {
    return (
      <main className="wrap" style={{ padding: "80px 0" }}>
        <h1 className="display" style={{ fontSize: 54 }}>
          We can&apos;t find that order
        </h1>
        <p className="lede">The link may be incomplete. Check the receipt email, or start again.</p>
        <Link className="btn" href="/#summon">
          Back to the summoning
        </Link>
      </main>
    );
  }

  const paid = session.payment_status === "paid";

  // Safety net: if Stripe's webhook has not landed yet (or was misconfigured),
  // place the print order here. Prodigi dedupes on the session id, so this can
  // never produce a second shirt.
  let prodigiOrderId: string | undefined;
  let fulfilError: string | undefined;
  if (paid) {
    const result = await fulfillSession(id).catch((err) => ({
      status: "error" as const,
      message: err instanceof Error ? err.message : "Fulfilment failed",
    }));
    if (result.status === "error") fulfilError = result.message;
    else if (result.status !== "unpaid") prodigiOrderId = result.orderId;
  }

  let prodigi: ProdigiOrder | undefined;
  if (prodigiOrderId) {
    prodigi = (await getProdigiOrder(prodigiOrderId).catch(() => undefined))?.order;
  }

  const meta = session.metadata ?? {};
  const spec = decodeSpec(meta.design_token ?? "");
  const color = colorById(meta.garment_color ?? "");
  const size = sizeById(meta.garment_size ?? "");
  const cryptid = spec ? generateCryptid(spec) : null;
  const plate = cryptid && color ? renderPlate(cryptid, color.ink, "ord") : null;

  const shipment = prodigi?.shipments?.[0];
  const issues = prodigi?.status?.issues ?? [];

  return (
    <main className="wrap order-grid">
      <div>
        <p className="eyebrow">{paid ? "Order confirmed" : "Payment pending"}</p>
        <h1 className="display" style={{ fontSize: "clamp(42px, 6vw, 70px)", margin: "12px 0 18px" }}>
          {paid ? "It has been documented." : "Waiting on payment."}
        </h1>
        <p className="lede">
          {paid ? (
            <>
              {cryptid ? <strong>{cryptid.commonName}</strong> : "Your specimen"} is on its way to the
              press. We&apos;ll email {session.customer_details?.email ?? "you"} when it ships.
            </>
          ) : (
            <>
              This checkout has not completed. Nothing has been sent to the printer and you have not
              been charged.
            </>
          )}
        </p>

        <ul className="status-list">
          <li>
            <span className="k">Payment</span>
            <span className="v">
              <span className={paid ? "pill good" : "pill warn"}>{session.payment_status}</span>
              {session.amount_total != null && (
                <span style={{ marginLeft: 12 }}>
                  {formatUsd(session.amount_total)} {session.currency?.toUpperCase()}
                </span>
              )}
            </span>
          </li>
          <li>
            <span className="k">Garment</span>
            <span className="v">
              {color?.label ?? "—"} · {size?.label ?? "—"} · Bella + Canvas 3001
            </span>
          </li>
          {cryptid && (
            <li>
              <span className="k">Specimen</span>
              <span className="v">
                {cryptid.specimenId} · <em>{cryptid.binomial}</em>
              </span>
            </li>
          )}
          <li>
            <span className="k">Print order</span>
            <span className="v">
              {prodigiOrderId ? (
                <>
                  <span className="pill good code">{prodigiOrderId}</span>
                  {prodigi?.status?.stage && (
                    <span style={{ marginLeft: 12 }}>{prodigi.status.stage}</span>
                  )}
                </>
              ) : paid ? (
                <span className="pill warn">Being placed…</span>
              ) : (
                <span className="pill">Not placed — payment required</span>
              )}
            </span>
          </li>
          {shipment?.tracking?.number && (
            <li>
              <span className="k">Tracking</span>
              <span className="v">
                <a href={shipment.tracking.url} target="_blank" rel="noreferrer">
                  {shipment.carrier?.name} {shipment.tracking.number}
                </a>
              </span>
            </li>
          )}
        </ul>

        {prodigi && (
          <ul className="status-list">
            {Object.entries(STAGE_LABELS).map(([key, label]) => {
              const s = stageState(prodigi!.status?.details?.[key]);
              return (
                <li key={key}>
                  <span className="k">{label}</span>
                  <span className="v">
                    <span className={s.cls}>{s.text}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        {issues.length > 0 && (
          <div className="notice" style={{ marginTop: 22 }}>
            <strong>The printer flagged something:</strong>
            <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
              {issues.map((i, n) => (
                <li key={n}>{i.description}</li>
              ))}
            </ul>
          </div>
        )}

        {fulfilError && (
          <div className="notice" style={{ marginTop: 22 }}>
            Your payment went through, but we hit a snag handing the file to the printer:{" "}
            <code>{fulfilError}</code>. Reload this page in a minute, or reply to your receipt and
            we&apos;ll sort it by hand.
          </div>
        )}

        <div style={{ marginTop: 30, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link className="btn ghost" href="/#summon">
            Summon another
          </Link>
          {prodigiOrderId && (
            <a className="btn ghost" href={`/order/${id}`}>
              Refresh status
            </a>
          )}
        </div>
      </div>

      <div>
        {plate && color && cryptid ? (
          <>
            <div className="tee-frame">
              <TeeMockup
                garmentHex={color.hex}
                plate={plate}
                label={`${cryptid.commonName} on a ${color.label} t-shirt`}
              />
            </div>
            <div className="namecard">
              <h3>{cryptid.commonName.toUpperCase()}</h3>
              <p>
                {cryptid.binomial} · plate no. {cryptid.plateNo}
              </p>
            </div>
            <div className="stage-actions">
              <a
                className="btn ghost block"
                href={previewUrl(siteUrl(), color.ink, meta.design_token!, 1400, color.hex)}
                target="_blank"
                rel="noreferrer"
              >
                View your plate full size
              </a>
            </div>
          </>
        ) : (
          <div className="notice">The design for this order could not be reconstructed.</div>
        )}
      </div>
    </main>
  );
}
