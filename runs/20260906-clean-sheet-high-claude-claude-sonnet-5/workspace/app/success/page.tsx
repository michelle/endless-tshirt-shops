import Link from "next/link";
import { stripe } from "@/lib/stripe";
import { getShirt } from "@/lib/shirts";

export const dynamic = "force-dynamic";

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id } = await searchParams;

  if (!session_id) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-24 text-center">
        <p className="font-mono text-neutral-400">No session found.</p>
        <Link href="/" className="font-mono text-emerald-400 mt-4 inline-block">
          Back to shop
        </Link>
      </div>
    );
  }

  let session;
  try {
    session = await stripe.checkout.sessions.retrieve(session_id);
  } catch {
    session = null;
  }

  if (!session || session.payment_status !== "paid") {
    return (
      <div className="mx-auto max-w-2xl px-6 py-24 text-center">
        <p className="font-mono text-neutral-400">
          We couldn&apos;t confirm this order yet. If you completed checkout, hang tight —
          this can take a few seconds.
        </p>
        <Link href="/" className="font-mono text-emerald-400 mt-4 inline-block">
          Back to shop
        </Link>
      </div>
    );
  }

  const slug = session.metadata?.slug;
  const size = session.metadata?.size;
  const shirt = slug ? getShirt(slug) : undefined;
  const address =
    session.collected_information?.shipping_details?.address ?? session.customer_details?.address;

  return (
    <div className="mx-auto max-w-2xl px-6 py-20">
      <p className="font-mono text-emerald-400 text-sm tracking-widest">HTTP/1.1 200 OK</p>
      <h1 className="font-mono text-4xl font-extrabold mt-3">Order confirmed.</h1>
      <p className="mt-4 text-neutral-400">
        Thanks — your payment went through and your shirt has been sent to production.
      </p>

      <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.02] p-6 font-mono text-sm space-y-3">
        {shirt && (
          <div className="flex justify-between">
            <span className="text-neutral-500">Item</span>
            <span>
              {shirt.code} {shirt.title} — Size {size}
            </span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-neutral-500">Total</span>
          <span>
            ${((session.amount_total ?? 0) / 100).toFixed(2)}{" "}
            {session.currency?.toUpperCase()}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-neutral-500">Email</span>
          <span>{session.customer_details?.email}</span>
        </div>
        {address && (
          <div className="flex justify-between">
            <span className="text-neutral-500">Shipping to</span>
            <span className="text-right">
              {address.line1}
              {address.line2 ? `, ${address.line2}` : ""}
              <br />
              {address.city}, {address.state} {address.postal_code}
              <br />
              {address.country}
            </span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-neutral-500">Order ref</span>
          <span className="text-neutral-500">{session.id}</span>
        </div>
      </div>

      <p className="mt-6 text-xs text-neutral-600 font-mono">
        Production is handled by Prodigi in sandbox mode — no physical shirt will actually
        ship for this order.
      </p>

      <Link href="/" className="font-mono text-emerald-400 mt-8 inline-block">
        ← Back to shop
      </Link>
    </div>
  );
}
