import OrderStatus from "@/components/OrderStatus";

export default async function OrderPage({
  searchParams,
}: {
  searchParams: Promise<{ payment_intent?: string }>;
}) {
  const { payment_intent } = await searchParams;
  return <OrderStatus paymentIntentId={payment_intent ?? null} />;
}
