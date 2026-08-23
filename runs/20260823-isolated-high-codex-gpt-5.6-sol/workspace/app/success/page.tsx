import { OrderConfirmation } from "@/components/order-confirmation";
import Link from "next/link";

export default async function SuccessPage({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const { session_id: sessionId } = await searchParams;
  if (!sessionId) return <main className="confirmation-page"><p>Missing checkout reference.</p><Link href="/">Return to the store</Link></main>;
  return <OrderConfirmation sessionId={sessionId} />;
}
