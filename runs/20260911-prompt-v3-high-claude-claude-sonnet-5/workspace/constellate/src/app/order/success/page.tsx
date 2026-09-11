import Link from "next/link";
import { getStripe } from "@/lib/stripe";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

function artworkSrc(md: Record<string, string>) {
  const params = new URLSearchParams({
    title: md.design_title || "",
    date: md.design_date || "",
    subtitle: md.design_subtitle || "",
    palette: md.design_palette || "midnight",
    format: "svg",
  });
  return `/api/artwork?${params.toString()}`;
}

export default async function OrderSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id } = await searchParams;

  if (!session_id) {
    return (
      <div className="mx-auto max-w-lg px-6 py-20 text-center">
        <h1 className="font-serif text-2xl mb-3">No order found</h1>
        <p className="text-white/60 mb-6">We couldn&apos;t find a checkout session to confirm.</p>
        <Link href="/design" className="underline">
          Start a new design
        </Link>
      </div>
    );
  }

  const stripe = getStripe();
  let session: Stripe.Checkout.Session | null = null;
  try {
    session = await stripe.checkout.sessions.retrieve(session_id, { expand: ["payment_intent"] });
  } catch {
    session = null;
  }

  if (!session) {
    return (
      <div className="mx-auto max-w-lg px-6 py-20 text-center">
        <h1 className="font-serif text-2xl mb-3">Order not found</h1>
        <p className="text-white/60 mb-6">That checkout session doesn&apos;t exist or has expired.</p>
        <Link href="/design" className="underline">
          Start a new design
        </Link>
      </div>
    );
  }

  const paid = session.payment_status === "paid";
  const md = (session.metadata || {}) as Record<string, string>;
  const pi = typeof session.payment_intent === "object" ? session.payment_intent : null;
  const prodigiOrderId = pi?.metadata?.prodigi_order_id;
  const prodigiStatus = pi?.metadata?.prodigi_status;

  if (!paid) {
    return (
      <div className="mx-auto max-w-lg px-6 py-20 text-center">
        <h1 className="font-serif text-2xl mb-3">Payment not completed</h1>
        <p className="text-white/60 mb-6">This order hasn&apos;t been paid yet, so nothing has been sent to print.</p>
        <Link href="/design" className="underline">
          Back to designer
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-16 text-center">
      <p className="uppercase tracking-[0.3em] text-xs text-white/50 mb-4">Payment confirmed</p>
      <h1 className="font-serif text-3xl mb-4">Your shirt is headed to print.</h1>
      <div className="rounded-2xl overflow-hidden border border-white/10 bg-black/40 max-w-xs mx-auto mb-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={artworkSrc(md)} alt="Your constellation design" className="w-full" />
      </div>
      <p className="text-white/70 mb-2">
        {md.shirt_size?.toUpperCase()} · {md.shirt_color} · qty {md.quantity}
      </p>
      <p className="text-white/50 text-sm mb-8">
        A receipt was sent to {session.customer_details?.email}. We&apos;ve queued this design with our
        direct-to-garment production partner.
      </p>

      <div className="rounded-xl border border-white/10 p-4 text-sm text-left mx-auto max-w-sm mb-10">
        <div className="flex justify-between py-1">
          <span className="text-white/50">Order reference</span>
          <span className="font-mono text-xs">{session.id.slice(-12)}</span>
        </div>
        <div className="flex justify-between py-1">
          <span className="text-white/50">Print status</span>
          <span>{prodigiOrderId ? prodigiStatus || "In production" : "Sending to production…"}</span>
        </div>
      </div>

      <Link href="/design" className="rounded-full bg-white text-black px-6 py-3 font-medium hover:bg-white/85 transition">
        Design another
      </Link>
    </div>
  );
}
