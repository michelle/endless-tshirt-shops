import { Suspense } from "react";
import { OrderStatus } from "@/components/OrderStatus";

export const metadata = { title: "Thank you — Orbitday" };

export default function ThanksPage() {
  return (
    <Suspense fallback={<p style={{ color: "var(--muted)" }}>Loading…</p>}>
      <OrderStatus />
    </Suspense>
  );
}
