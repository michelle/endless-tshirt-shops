import { Suspense } from "react";
import { OrderConfirm } from "@/components/OrderConfirm";

export const metadata = { title: "Order confirmed" };

export default function SuccessPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-slab text-4xl mb-8">Thank you</h1>
      <Suspense fallback={<p className="text-ink-2">Loading…</p>}>
        <OrderConfirm />
      </Suspense>
    </div>
  );
}
