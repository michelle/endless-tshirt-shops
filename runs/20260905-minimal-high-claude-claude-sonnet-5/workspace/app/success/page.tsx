import Link from "next/link";
import { getStripe } from "@/lib/stripe";
import { formatTimestampForPrint, isShirtSize, isShirtStyle, STYLES } from "@/lib/shirt";

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id } = await searchParams;

  if (!session_id) {
    return (
      <Result title="No order found">
        <p>We couldn&apos;t find a checkout session to confirm.</p>
      </Result>
    );
  }

  try {
    const session = await getStripe().checkout.sessions.retrieve(session_id);
    const { style, size, ts } = session.metadata ?? {};

    if (session.payment_status !== "paid") {
      return (
        <Result title="Payment not completed">
          <p>This checkout session hasn&apos;t been paid yet.</p>
        </Result>
      );
    }

    if (!isShirtStyle(style) || !isShirtSize(size) || !ts) {
      return (
        <Result title="Order confirmed">
          <p>Your payment went through, but we couldn&apos;t load the order details.</p>
        </Result>
      );
    }

    const { epoch, human } = formatTimestampForPrint(Number(ts));
    const artworkUrl = `/api/artwork?ts=${ts}&style=${style}`;
    const name =
      session.collected_information?.shipping_details?.name ??
      session.customer_details?.name;

    return (
      <Result title="Your moment is frozen.">
        <p className="text-neutral-400">
          Thanks{name ? `, ${name}` : ""}. Your {STYLES[style].label.toLowerCase()}{" "}
          tee (size {size}) is being sent to Prodigi&apos;s print network now.
        </p>

        <div className="mt-8 overflow-hidden rounded-2xl border border-neutral-800 bg-black">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={artworkUrl} alt="Your shirt artwork" className="w-full" />
        </div>

        <div className="mt-6 rounded-xl border border-neutral-800 p-4 text-left">
          <div className="tabular-clock font-display text-2xl font-bold">{epoch}</div>
          <div className="text-sm text-neutral-500">{human}</div>
        </div>

        <p className="mt-6 text-xs text-neutral-600">
          A receipt was sent to your email. Order reference:{" "}
          <span className="font-mono">{session.id}</span>
        </p>
      </Result>
    );
  } catch {
    return (
      <Result title="Something went wrong">
        <p>We couldn&apos;t load this order. Please contact support.</p>
      </Result>
    );
  }
}

function Result({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="flex-1 flex items-center justify-center px-6 py-24">
      <div className="max-w-md w-full text-center">
        <h1 className="font-display text-3xl font-black mb-4">{title}</h1>
        <div className="text-base">{children}</div>
        <Link
          href="/"
          className="mt-10 inline-block rounded-full border border-neutral-700 px-5 py-2.5 text-sm hover:border-neutral-500"
        >
          Back to datetime.store
        </Link>
      </div>
    </main>
  );
}
