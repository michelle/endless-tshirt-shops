import type { Metadata } from "next";
import { CartView } from "@/components/CartView";

export const metadata: Metadata = { title: "Cart" };

export default function CartPage() {
  return (
    <div className="wrap" style={{ padding: "40px 20px 60px", maxWidth: 860 }}>
      <h1 className="title">Your cart</h1>
      <CartView />
    </div>
  );
}
