import Link from "next/link";
import {
  fromMetadata,
  signPayload,
  verifyToken,
  type OrderConfig,
} from "@/lib/order";
import { getOrder } from "@/lib/prodigi";
import type { SkyConfig } from "@/lib/starmap";

export const dynamic = "force-dynamic";

function designTokenFrom(cfg: SkyConfig): string {
  return signPayload({
    lat: cfg.lat,
    lng: cfg.lng,
    date: cfg.date,
    time: cfg.time,
    place: cfg.place,
    title: cfg.title,
    theme: cfg.theme,
  });
}

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;

  let cfg: OrderConfig | SkyConfig | null = null;
  let prodigi: { id: string; stage: string } | null = null;
  let note: string | null = null;

  if (sp.session_id && process.env.STRIPE_SECRET_KEY) {
    // Stripe flow: confirm the session server-side.
    try {
      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      const session = await stripe.checkout.sessions.retrieve(sp.session_id);
      if (session.payment_status === "paid") {
        cfg = fromMetadata((session.metadata ?? {}) as Record<string, string>);
        note =
          "Your payment is confirmed and your shirt is being sent to print.";
      }
    } catch {
      note = "We could not confirm your session — please contact support.";
    }
  } else if (sp.t) {
    // Sandbox flow: the pay step has already fulfilled with Prodigi.
    cfg = verifyToken<OrderConfig>(sp.t);
    if (sp.po) {
      try {
        const raw = await getOrder(sp.po);
        const order = (raw.order ?? {}) as Record<string, unknown>;
        const status = (order.status ?? {}) as Record<string, unknown>;
        prodigi = { id: String(order.id ?? sp.po), stage: String(status.stage ?? "Unknown") };
      } catch {
        prodigi = { id: sp.po, stage: "Submitted" };
      }
    }
  }

  if (!cfg) {
    return (
      <main className="center-wrap">
        <div className="brand" style={{ marginBottom: 20 }}>
          Star<span>lit</span>
        </div>
        <p>We couldn&apos;t find that order. {note}</p>
        <p>
          <Link href="/" style={{ color: "var(--accent-bright)" }}>
            Back to the store
          </Link>
        </p>
      </main>
    );
  }

  const img = `/api/design?p=${encodeURIComponent(designTokenFrom(cfg))}&w=900`;

  return (
    <main className="center-wrap">
      <div className="brand" style={{ marginBottom: 26 }}>
        Star<span>lit</span>
      </div>
      <div className="check">✓</div>
      <h1 style={{ fontWeight: 300, letterSpacing: 2 }}>Your sky is on its way</h1>
      <p style={{ color: "var(--ink-dim)", lineHeight: 1.7 }}>
        {note ??
          "Payment confirmed. Your one-of-a-kind star map has been sent to print."}
      </p>

      <div className="order-summary">
        <strong>“{cfg.title}”</strong> — {cfg.place}
        <br />
        {cfg.date} · {cfg.time}
        {"ref" in cfg && (
          <>
            <br />
            Order {cfg.ref}
          </>
        )}
        {prodigi && (
          <>
            <br />
            Print order {prodigi.id} · status: <strong>{prodigi.stage}</strong>
          </>
        )}
      </div>

      <div className="success-art">
        {/* The exact artwork sent to the printer */}
        <img src={img} alt="Your personalized star map print" />
      </div>

      <p>
        <Link href="/" style={{ color: "var(--accent-bright)" }}>
          Design another sky →
        </Link>
      </p>
    </main>
  );
}
