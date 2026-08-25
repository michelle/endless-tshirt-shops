import Link from "next/link";
import { getStripe } from "@/lib/stripe";
import { isShirtSize, isShirtStyle, SHIRT_STYLES } from "@/lib/products";

export const dynamic = "force-dynamic";

async function loadSession(sessionId: string) {
  try {
    const stripe = getStripe();
    return await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["customer_details"],
    });
  } catch {
    return null;
  }
}

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id } = await searchParams;
  const session = session_id ? await loadSession(session_id) : null;

  if (!session || session.payment_status !== "paid") {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-6 px-6 text-center">
        <h1 className="font-mono text-2xl font-bold">We can&apos;t find that order</h1>
        <p className="text-neutral-400">
          If you just paid, hang tight and refresh — otherwise head back and
          try again.
        </p>
        <Link
          href="/"
          className="rounded-full border border-white/20 px-6 py-3 font-mono text-sm hover:bg-white/10"
        >
          Back to datetime.store
        </Link>
      </main>
    );
  }

  const meta = session.metadata || {};
  const style = isShirtStyle(meta.style) ? meta.style : null;
  const size = isShirtSize(meta.size) ? meta.size : null;
  const product = style ? SHIRT_STYLES[style] : null;
  const address = session.shipping_details?.address ?? session.customer_details?.address;
  const email = session.customer_details?.email;

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-8 px-6 py-16 text-center">
      <div className="text-5xl">✅</div>
      <div>
        <h1 className="font-mono text-3xl font-bold">Order confirmed</h1>
        <p className="mt-3 text-neutral-400">
          Your shirt is frozen at{" "}
          <span className="font-mono text-white">
            {meta.date} {meta.time} {meta.tz}
          </span>
          . It never existed before you bought it, and it won&apos;t again.
        </p>
      </div>

      <div className="w-full rounded-2xl border border-white/10 bg-white/5 p-6 text-left font-mono text-sm">
        <Row label="Item" value={product ? `${product.productName} (${size})` : "datetime.store tee"} />
        <Row label="Total" value={`$${((session.amount_total ?? 0) / 100).toFixed(2)}`} />
        <Row label="Receipt" value={email ?? "—"} />
        {address ? (
          <Row
            label="Shipping to"
            value={[address.line1, address.line2, address.city, address.state, address.postal_code, address.country]
              .filter(Boolean)
              .join(", ")}
          />
        ) : null}
      </div>

      <p className="max-w-sm text-xs text-neutral-500">
        We&apos;re sending this exact artwork to print via Prodigi right now.
        You&apos;ll get a shipping confirmation by email once it&apos;s on
        its way.
      </p>

      <Link
        href="/"
        className="rounded-full border border-white/20 px-6 py-3 font-mono text-sm transition hover:bg-white hover:text-black"
      >
        Get another shirt
      </Link>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-white/5 py-2 last:border-0">
      <span className="text-neutral-500">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}
