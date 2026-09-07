import { notFound } from "next/navigation";
import { getOrder } from "@/lib/prodigi";
import { OrderStatus } from "@/components/OrderStatus";

export const dynamic = "force-dynamic";

export default async function OrderPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ new?: string; ref?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const order = await getOrder(id);
  if (!order) notFound();
  return <OrderStatus order={order} isNew={sp.new === "1"} reference={sp.ref} />;
}
