import { Suspense } from "react";
import { Designer } from "@/components/Designer";

export const metadata = { title: "Design your Orbitday tee" };

export default function DesignPage() {
  return (
    <>
      <div style={{ padding: "10px 0 0" }}>
        <div className="eyebrow">Designer</div>
        <h1 style={{ fontSize: "clamp(30px, 4vw, 48px)", marginBottom: 6 }}>Your date, your sky.</h1>
        <p className="lede" style={{ marginBottom: 10 }}>Everything updates live. The print file tab shows exactly what the printer receives.</p>
      </div>
      <Suspense fallback={<div style={{ padding: 40, color: "var(--muted)" }}>Loading designer…</div>}>
        <Designer />
      </Suspense>
    </>
  );
}
