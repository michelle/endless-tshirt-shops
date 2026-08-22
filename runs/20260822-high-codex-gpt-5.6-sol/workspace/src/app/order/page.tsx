import { OrderStatus } from "@/components/order-status";

export default async function OrderPage({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const { session_id } = await searchParams;
  return <OrderStatus sessionId={session_id || ""}/>;
}
