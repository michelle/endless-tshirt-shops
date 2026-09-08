import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Payment received" };

export default function Pending() {
  return (
    <div className="wrap narrow center" style={{ padding: "60px 20px" }}>
      <div className="rule-orn caps">Payment received</div>
      <h1 className="title" style={{ marginTop: 14 }}>Thank you.</h1>
      <p className="muted">
        We&rsquo;re handing your order to the press now. You&rsquo;ll get a confirmation email with a
        tracking link as soon as it&rsquo;s printed.
      </p>
      <Link className="btn ghost" href="/">Back to the saints</Link>
    </div>
  );
}
