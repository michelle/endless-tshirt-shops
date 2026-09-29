import Link from "next/link";

export default function SuccessPage() {
  return (
    <main className="container" style={{ textAlign: "center", paddingTop: 120, paddingBottom: 120 }}>
      <div className="serif" style={{ fontSize: 64, color: "var(--gold)", marginBottom: 16 }}>
        ✦
      </div>
      <h1 className="serif" style={{ fontSize: 44, fontWeight: 400, margin: "0 0 16px" }}>
        Your sky is on its way.
      </h1>
      <p style={{ color: "var(--ink-dim)", fontSize: 18, maxWidth: 480, margin: "0 auto 36px" }}>
        Thank you for your order. We&apos;ve received your payment and your
        one-of-a-kind star map t-shirt is now being printed and will ship
        straight to you.
      </p>
      <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
        <Link href="/customize" className="btn btn-primary">
          Design another
        </Link>
        <Link href="/" className="btn btn-ghost">
          Back home
        </Link>
      </div>
    </main>
  );
}
