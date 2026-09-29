import Link from "next/link";
import { getShirt, SIZE_LABELS, SizeId } from "@/lib/config";
import { weekStats } from "@/lib/design";
import { designFromSession, fulfillStripeSession, renderDesignSVG } from "@/lib/fulfill";
import { getStripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

/**
 * /success?session_id=...
 *
 * Server-rendered: retrieves the Checkout Session from the Stripe API
 * (never trusting the URL), verifies payment_status === "paid", and only
 * then sends the shirt to Prodigi. Idempotent — refreshing the page or a
 * race with the webhook cannot double-order (Prodigi idempotency key).
 */
export default async function SuccessPage({
  searchParams,
}: {
  searchParams: { session_id?: string };
}) {
  const sessionId = searchParams.session_id;

  if (!sessionId) {
    return (
      <div className="success-wrap">
        <div className="success-card">
          <h1>Nothing to see here</h1>
          <p className="note">This page is for completed checkouts only.</p>
          <Link href="/">← Back to the store</Link>
        </div>
      </div>
    );
  }

  let session;
  try {
    session = await getStripe().checkout.sessions.retrieve(sessionId);
  } catch {
    return (
      <div className="success-wrap">
        <div className="success-card">
          <h1>Checkout not found</h1>
          <p className="note">
            We couldn&apos;t retrieve that checkout session. If you were
            charged, contact support with session id{" "}
            <code>{sessionId}</code>.
          </p>
          <Link href="/">← Back to the store</Link>
        </div>
      </div>
    );
  }

  const paid = session.payment_status === "paid";
  const result = paid ? await fulfillStripeSession(session) : null;
  const design = designFromSession(session);
  const shirt = design ? getShirt(design.shirt) : undefined;
  const stats = design ? weekStats(design) : null;
  const svg = design ? renderDesignSVG(design) : null;
  const email = session.customer_details?.email;

  return (
    <div className="success-wrap">
      <div className="success-card">
        {!paid ? (
          <>
            <span className="tag">Payment not completed</span>
            <h1>This checkout isn&apos;t paid yet</h1>
            <p className="note">
              Stripe reports this session as <code>{session.payment_status ?? "unknown"}</code>.
              No shirt has been ordered — nothing goes to print until payment
              succeeds.
            </p>
            <p className="note">
              <Link href="/#make">← Try again</Link>
            </p>
          </>
        ) : result?.ok ? (
          <>
            <span className="tag">Paid · sent to print</span>
            <h1>
              {design?.name ? `${design.name}, ` : ""}your life is on its way
            </h1>
            {shirt && svg && (
              <div className="garment" style={{ background: shirt.previewHex }}>
                <div
                  className="print"
                  role="img"
                  aria-label="The print that will be on your shirt"
                  dangerouslySetInnerHTML={{ __html: svg }}
                />
              </div>
            )}
            {design && stats && (
              <p className="note">
                {nf(stats.lived)} weeks of your life, printed as dots — frozen
                as of {design.asof}. The ringed dot is week{" "}
                {nf(stats.current)} — the week you bought this shirt.
              </p>
            )}
            <div className="order-meta">
              <div className="cell">
                Print order
                <b>{result.orderId ?? "—"}</b>
              </div>
              <div className="cell">
                Status
                <b>{result.orderStage ?? "in progress"}</b>
              </div>
              <div className="cell">
                Garment
                <b>
                  {shirt?.label} · {design ? SIZE_LABELS[design.size as SizeId] : ""} · ×
                  {design?.qty}
                </b>
              </div>
              <div className="cell">
                Paid
                <b>${((session.amount_total ?? 0) / 100).toFixed(2)}</b>
              </div>
            </div>
            <p className="note">
              A human-sized summary{email ? <> was emailed to {email}</> : ""}:
              your tee is printed with water-based DTG inks at the lab nearest
              your address, usually within 3–5 working days, then shipped.
              Keep your print order id for reference.
            </p>
            <p className="note">
              <Link href="/">← Make another one (a gift, maybe?)</Link>
            </p>
          </>
        ) : (
          <>
            <span className="tag">Paid · fulfilment hiccup</span>
            <h1>Payment received — but the print order needs attention</h1>
            <p className="note error">
              Your payment succeeded, but sending the order to the print lab
              failed{result?.error ? `: ${result.error}` : ""}. Nothing is
              lost: reply to your receipt or contact support with session id{" "}
              <code>{sessionId}</code> and we&apos;ll fulfil it immediately —
              you will not be charged twice.
            </p>
            <p className="note">
              <Link href="/">← Back to the store</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function nf(n: number): string {
  return n.toLocaleString("en-US");
}
