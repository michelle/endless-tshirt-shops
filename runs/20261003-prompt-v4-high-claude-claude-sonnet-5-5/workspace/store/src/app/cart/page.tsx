import type { Metadata } from "next";
import { CartView } from "@/components/CartView";

export const metadata: Metadata = { title: "Your cart" };
export default function CartPage() {
  return <div className="page"><h1 style={{ fontSize: "2.6rem" }}>Your cart</h1><CartView /></div>;
}
