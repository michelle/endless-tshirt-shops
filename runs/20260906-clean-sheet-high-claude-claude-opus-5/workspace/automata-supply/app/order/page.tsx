import type { Metadata } from "next";
import { stripe } from "@/lib/stripe";
import { fulfilSession, recordFailure } from "@/lib/fulfil";
import { getOrder } from "@/lib/prodigi";
import { decodeLineItem, GARMENT_BY_ID, INKS, SIZES, designSubtitle } from "@/lib/design";
import { unchunkItems } from "@/lib/stripe";
import { formatUsd } from "@/lib/catalog";
import { artUrl } from "@/lib/art";
import { ClearCart } from "@/components/ClearCart";

export const dynamic = "force-dynamic";

/**
 * How long the webhook gets to submit the print order before this page will do
 * it instead. Prodigi has no idempotency keys, so if both submitted at once we
 * would print — and pay for — the order twice.
 */
const WEBHOOK_GRACE_SECONDS = 45;

export const metadata: Metadata = {
  title: "Your order — Automata Supply",
  robots: { index: false },
};

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="wrap" style={{ padding: "56px 24px 110px", maxWidth: 780 }}>
      {children}
    </div>
  );
}

export default async function OrderPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const sessionIdRaw = sp.session_id;
  const sessionId = Array.isArray(sessionIdRaw) ? sessionIdRaw[0] : sessionIdRaw;

  if (!sessionId) {
    return (
      <Shell>
        <h1 className="hero-title" style={{ fontSize: 32 }}>No order specified</h1>
        <a className="btn" href="/">Back to the shop</a>
      </Shell>
    );
  }

  const client = stripe();
  let session;
  try {
    session = await client.checkout.sessions.retrieve(sessionId, {
      expand: ["shipping_cost.shipping_rate", "payment_intent"],
    });
  } catch {
    return (
      <Shell>
        <h1 className="hero-title" style={{ fontSize: 32 }}>We could not find that order</h1>
        <p className="product-note">The link may have expired. Check your email receipt from Stripe.</p>
        <a className="btn" href="/">Back to the shop</a>
      </Shell>
    );
  }

  if (session.payment_status !== "paid") {
    return (
      <Shell>
        <p className="eyebrow">Order</p>
        <h1 className="hero-title" style={{ fontSize: 32 }}>Payment not completed</h1>
        <p className="product-note">
          Stripe has not confirmed this payment. If you closed the payment page,
          your cart is still where you left it.
        </p>
        <a className="btn btn-primary" href="/cart">Back to cart</a>
      </Shell>
    );
  }

  // The webhook is the primary path to fulfilment, but it can arrive after the
  // customer lands here. This call is idempotent, so running it now just means
  // the page can show a real print order instead of "pending".
  let fulfilError: string | null = null;
  let prodigiOrderId: string | null = null;
  let awaitingWebhook = false;
  try {
    const result = await fulfilSession(client, session, {
      minAgeSecondsBeforeCreate: WEBHOOK_GRACE_SECONDS,
    });
    if (result.status === "failed") {
      fulfilError = result.error;
      await recordFailure(client, session, result.error);
    } else if (result.status === "waiting") {
      awaitingWebhook = true;
    } else {
      prodigiOrderId = result.orderId;
    }
  } catch (e) {
    fulfilError = e instanceof Error ? e.message : "Fulfilment error";
  }

  const prodigiOrder = prodigiOrderId ? await getOrder(prodigiOrderId) : null;
  const stage: string | null = prodigiOrder?.order?.status?.stage ?? null;

  const items = unchunkItems(session.metadata)
    .map(decodeLineItem)
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const shipRate =
    session.shipping_cost?.shipping_rate && typeof session.shipping_cost.shipping_rate !== "string"
      ? session.shipping_cost.shipping_rate.display_name
      : null;

  return (
    <Shell>
      <ClearCart />
      {/* While the webhook is still working, refresh so the customer sees the
          print order appear without having to reload by hand. */}
      {awaitingWebhook ? <meta httpEquiv="refresh" content="6" /> : null}
      <p className="eyebrow">Order confirmed</p>
      <h1 className="hero-title" style={{ fontSize: 34, marginBottom: 10 }}>
        Your automata are queued for print.
      </h1>
      <p className="product-note" style={{ marginBottom: 30 }}>
        A receipt is on its way to{" "}
        <strong style={{ color: "var(--fg)" }}>{session.customer_details?.email}</strong>. Each
        shirt is printed for this order specifically, so give it a few days
        before it ships.
      </p>

      <div className="panel" style={{ marginBottom: 26 }}>
        <div className="spec" style={{ borderTop: "none", marginTop: 0, paddingTop: 0 }}>
          <div>
            <span>Order</span>
            <span>{session.id.slice(-16)}</span>
          </div>
          <div>
            <span>Print order</span>
            <span>
              {prodigiOrderId ? (
                <span className="status-pill">{stage ?? "submitted"}</span>
              ) : awaitingWebhook ? (
                <span className="status-pill pending">submitting</span>
              ) : (
                <span className="status-pill error">not submitted</span>
              )}
            </span>
          </div>
          {prodigiOrderId ? (
            <div>
              <span>Prodigi reference</span>
              <span>{prodigiOrderId}</span>
            </div>
          ) : null}
          <div>
            <span>Shipping</span>
            <span>{shipRate ?? "Standard"}</span>
          </div>
          <div>
            <span>Total paid</span>
            <span>{formatUsd(session.amount_total ?? 0)}</span>
          </div>
        </div>
      </div>

      {fulfilError ? (
        <p className="notice" style={{ borderColor: "#c0504d", color: "#ef8f8c", marginBottom: 26 }}>
          Your payment went through, but we could not hand the order to the
          printer automatically. We have logged it and will submit it manually —
          no action needed from you.
          <br />
          <span style={{ opacity: 0.7 }}>{fulfilError}</span>
        </p>
      ) : null}

      <h2 className="section-title" style={{ marginBottom: 8 }}>What you bought</h2>
      {items.map((item, i) => {
        const garment = GARMENT_BY_ID[item.garmentId];
        return (
          <div className="cart-row" key={i}>
            <div className="cart-thumb" style={{ background: garment.hex, padding: 4 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={artUrl(item.design, 260)}
                alt=""
                style={{ width: "100%", display: "block", imageRendering: "pixelated" }}
              />
            </div>
            <div>
              <div className="cart-name">Rule {String(item.design.rule).padStart(3, "0")}</div>
              <div className="cart-meta">
                {designSubtitle(item.design)} · {INKS[item.design.ink].name} ink · {garment.name} ·{" "}
                {SIZES.find((s) => s.id === item.size)?.label}
              </div>
            </div>
            <div className="mono" style={{ fontSize: 13 }}>×{item.qty}</div>
          </div>
        );
      })}

      <div className="row" style={{ marginTop: 34 }}>
        <a className="btn" href="/">Back to the shop</a>
        <a className="btn" href="/design">Design another</a>
      </div>
    </Shell>
  );
}
