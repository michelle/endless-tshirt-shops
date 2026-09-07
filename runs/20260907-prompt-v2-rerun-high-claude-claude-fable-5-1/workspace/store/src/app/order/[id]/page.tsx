import type { Metadata } from "next";
import { OrderStatus } from "@/components/OrderStatus";

export const metadata: Metadata = { title: "Your order", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function OrderPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ t?: string; paid?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  if (!sp.t) {
    return (
      <div className="narrow">
        <h1>Order not found</h1>
        <p className="muted">This link is missing its access token. Use the link from your confirmation page or email.</p>
      </div>
    );
  }
  return (
    <div className="narrow">
      <OrderStatus id={id} token={sp.t} clearCart={sp.paid === "1"} />
    </div>
  );
}
