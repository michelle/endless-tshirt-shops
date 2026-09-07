import OrderStatus from "@/components/OrderStatus";

export default async function OrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-24">
      <OrderStatus paymentIntentId={id} />
    </main>
  );
}
