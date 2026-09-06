import Link from "next/link";
import { OrderStatus } from "@/components/OrderStatus";

export const metadata = { title: "Your order", robots: { index: false } };

export default async function OrderPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  return (
    <div className="mx-auto max-w-4xl px-5 py-12">
      <p className="font-mono text-accent text-sm mb-3">HTTP/1.1 201 Created</p>
      <h1 className="font-mono font-extrabold text-3xl sm:text-4xl tracking-tight">Order placed.</h1>
      <p className="text-muted mt-2 mb-8">Bookmark this page, it updates as your shirt moves through the print lab.</p>
      <OrderStatus sessionId={sessionId} />
      <p className="font-mono text-xs text-muted mt-10">Order ref {sessionId}</p>
      <Link href="/" className="inline-block mt-6 font-mono text-sm underline hover:text-accent">← back to the codes</Link>
    </div>
  );
}
