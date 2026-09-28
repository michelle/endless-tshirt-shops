import { Suspense } from "react";
import OrderStatus from "@/components/OrderStatus";
import { stripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

async function loadSession(id: string) {
  try {
    const session = await stripe().checkout.sessions.retrieve(id, {
      expand: ["customer_details"],
    });
    return session;
  } catch (err) {
    return null;
  }
}

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: { session_id?: string };
}) {
  const sessionId = searchParams.session_id;
  if (!sessionId) {
    return (
      <main className="container">
        <p>No session id supplied. If you completed checkout your receipt was emailed to you.</p>
        <p><a href="/">Back to the store</a></p>
      </main>
    );
  }

  const session = await loadSession(sessionId);

  return (
    <main className="container">
      <p className="banner ok">
        Payment received · we&rsquo;ve put your order in the print queue.
      </p>
      <header style={{ marginTop: 24 }}>
        <p className="kicker">Order</p>
        <h1
          className="hero"
          style={{
            fontSize: "clamp(1.8rem, 4vw, 2.6rem)",
            margin: "8px 0 0",
          }}
        >
          Your sky is on its way.
        </h1>
        <p style={{ color: "var(--ink-soft)", marginTop: 8 }}>
          Stripe confirmed the payment. The webhook will hand the order to the printer within a
          few seconds. The status below should update shortly.
        </p>
      </header>

      <Suspense fallback={<p>Loading order details…</p>}>
        <OrderStatus sessionId={sessionId} session={session} />
      </Suspense>

      <p style={{ marginTop: 32 }}>
        <a href="/">Make another</a>
      </p>
    </main>
  );
}
