import { notFound } from "next/navigation";
import { OrderStatus } from "@/components/OrderStatus";
import { getOrderView } from "@/lib/orders";

export const dynamic = "force-dynamic";

export default async function OrderPage({ params }: PageProps<"/orders/[id]">) {
  const { id } = await params;
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(id)) notFound();
  let view;
  try {
    view = await getOrderView(id);
  } catch (e) {
    console.error(e);
    notFound();
  }
  return (
    <div className="mx-auto max-w-6xl px-5 py-12 sm:py-16">
      <OrderStatus initial={view} />
    </div>
  );
}
