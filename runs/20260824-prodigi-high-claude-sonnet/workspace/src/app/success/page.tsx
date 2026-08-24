import Link from "next/link";
import { OrderStatus } from "@/components/OrderStatus";

export default async function SuccessPage({ searchParams }: PageProps<"/success">) {
  const params = await searchParams;
  const sessionId = typeof params.session_id === "string" ? params.session_id : null;

  if (!sessionId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-4">
        <h1 className="text-2xl font-bold">Missing session</h1>
        <p className="text-neutral-400">We couldn&rsquo;t find a checkout session to confirm.</p>
        <Link href="/" className="text-orange-400 underline font-mono">
          Back to datetime.store
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center">
      <OrderStatus sessionId={sessionId} />
    </div>
  );
}
