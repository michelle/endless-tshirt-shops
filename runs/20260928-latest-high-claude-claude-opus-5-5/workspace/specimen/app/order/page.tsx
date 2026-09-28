import type { Metadata } from "next";
import { OrderStatus } from "@/components/OrderStatus";

export const metadata: Metadata = { title: "Your order — SPECIMEN" };

export default async function OrderPage({ searchParams }: PageProps<"/order">) {
  const { session_id } = await searchParams;
  return (
    <main className="wrap order">
      <OrderStatus sessionId={typeof session_id === "string" ? session_id : ""} />
    </main>
  );
}
