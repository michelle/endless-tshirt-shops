import { Suspense } from "react";
import { CartView } from "@/components/CartView";

export const metadata = { title: "Cart" };

export default function CartPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-slab text-4xl mb-8">Your cart</h1>
      <Suspense fallback={<p className="text-ink-2">Loading your cart…</p>}>
        <CartView />
      </Suspense>
    </div>
  );
}
