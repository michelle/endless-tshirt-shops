import type { Metadata } from "next";
import { CheckoutForm } from "@/components/CheckoutForm";
import { paymentMode } from "@/lib/site";

export const metadata: Metadata = { title: "Checkout" };
export const dynamic = "force-dynamic";

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ cancelled?: string }> }) {
  const sp = await searchParams;
  return (
    <div className="wide">
      <h1>Checkout</h1>
      <CheckoutForm mode={paymentMode()} cancelled={sp.cancelled === "1"} />
    </div>
  );
}
