import Link from "next/link";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { formatHumanDate, formatMs, isShirtStyle } from "@/lib/shirt";
import ShirtPreview from "@/components/ShirtPreview";
import OrderStatus from "@/components/OrderStatus";

async function loadSession(
  sessionId: string,
): Promise<{ session: Stripe.Checkout.Session } | { error: true }> {
  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    return { session };
  } catch (err) {
    console.error("success page error", err);
    return { error: true };
  }
}

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id: sessionId } = await searchParams;

  if (!sessionId) {
    return (
      <Main>
        <p className="text-black/60">Missing order reference.</p>
        <Link href="/" className="underline">
          Back to datetime.store
        </Link>
      </Main>
    );
  }

  const result = await loadSession(sessionId);

  if ("error" in result) {
    return (
      <Main>
        <p className="text-black/60 mb-4">
          We couldn&rsquo;t load that order. If you were just charged, check
          your email for a receipt.
        </p>
        <Link href="/" className="underline">
          Back to datetime.store
        </Link>
      </Main>
    );
  }

  const { session } = result;
  const meta = session.metadata ?? {};
  const style = isShirtStyle(meta.style) ? meta.style : "unisex";
  const timestampMs = meta.timestampMs ? Number(meta.timestampMs) : null;
  const email = session.customer_details?.email;

  if (session.payment_status !== "paid") {
    return (
      <Main>
        <h1 className="text-2xl font-bold mb-2">Payment not complete</h1>
        <p className="text-black/60 mb-6">
          We didn&rsquo;t receive a completed payment for this session.
        </p>
        <Link href="/" className="underline">
          Back to datetime.store
        </Link>
      </Main>
    );
  }

  return (
    <Main>
      <div className="w-full max-w-sm mb-8">
        <div className="bg-[#f0efe9] rounded-3xl p-8">
          <ShirtPreview style={style} frozenMs={timestampMs} />
        </div>
      </div>

      <h1 className="text-2xl md:text-3xl font-black mb-2 text-center">
        Congrats on your pretty cool shirt! 🎉
      </h1>
      <p className="text-black/60 text-center max-w-md mb-1">
        {timestampMs
          ? `You captured ${formatHumanDate(timestampMs)} — forever yours, ${formatMs(timestampMs)} ms since epoch.`
          : "Your one-of-one moment has been captured."}
      </p>
      {email && (
        <p className="text-black/50 text-sm text-center mb-8">
          A confirmation email is on its way to <strong>{email}</strong>.
        </p>
      )}

      <OrderStatus sessionId={sessionId} />

      <Link
        href="/"
        className="mt-10 rounded-full bg-black text-white font-semibold px-6 py-3 text-sm hover:bg-black/85 transition-colors"
      >
        ♥ Get another shirt
      </Link>
    </Main>
  );
}

function Main({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
      {children}
    </main>
  );
}
