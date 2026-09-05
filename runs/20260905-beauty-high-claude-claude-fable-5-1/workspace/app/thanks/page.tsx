import Link from "next/link";
import type { Metadata } from "next";
import OrderStatus from "@/components/OrderStatus";

export const metadata: Metadata = { title: "Your moment — datetime.store", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Thanks({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const { session_id: sessionId } = await searchParams;
  const valid = typeof sessionId === "string" && /^cs_(test|live)_[A-Za-z0-9]+$/.test(sessionId);

  return (
    <>
      <header className="wrap header">
        <Link href="/" className="wordmark">
          <span className="wordmark-name">
            datetime<em>.</em>store
          </span>
          <span className="wordmark-est">est. 1970</span>
        </Link>
      </header>
      <main className="wrap">
        {valid ? (
          <OrderStatus sessionId={sessionId} />
        ) : (
          <section className="section">
            <h2>
              That link is missing its <em>moment</em>.
            </h2>
            <p className="hero-sub">We need a Stripe session id to look up your order. Try the link from your receipt.</p>
            <Link href="/" className="btn">
              ← Back to now
            </Link>
          </section>
        )}
      </main>
    </>
  );
}
