import Link from "next/link";
import { headers } from "next/headers";
import { stripe } from "@/lib/stripe";
import { ensureProdigiOrder } from "@/lib/fulfil";
import { decodeDesign, describeDesign } from "@/lib/design";
import { artUrl } from "@/lib/sign";
import { prodigiIsSandbox, type ProdigiOrder } from "@/lib/prodigi";

export const dynamic = "force-dynamic";

async function baseUrl(): Promise<string> {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, "");
  const h = await headers();
  return `${h.get("x-forwarded-proto") ?? "https"}://${h.get("x-forwarded-host") ?? h.get("host")}`;
}

export default async function OrderPage({ params }: PageProps<"/order/[sessionId]">) {
  const { sessionId } = await params;
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(sessionId)) return <Shell><p>Unknown order.</p></Shell>;

  let session;
  try {
    session = await stripe().checkout.sessions.retrieve(sessionId);
  } catch {
    return <Shell><p>We couldn’t find that order.</p></Shell>;
  }
  const paid = session.payment_status === "paid";
  const encoded = session.metadata?.design ?? "";
  const design = decodeDesign(encoded);
  const base = await baseUrl();

  let order: ProdigiOrder | null = null;
  let fulfilError: string | null = null;
  if (paid) {
    // Webhook normally does this first; calling again is idempotent and covers a missed webhook.
    try {
      const r = await ensureProdigiOrder(sessionId, base);
      if (r.status === "exists" || r.status === "created") order = r.order;
    } catch (e) {
      fulfilError = e instanceof Error ? e.message : String(e);
      console.error("order page fulfil", e);
    }
  }
  const stage = order?.status.stage;
  const shipment = order?.shipments?.find((s) => s.tracking?.url);
  const refresh = paid && (!order || stage === "InProgress");

  return (
    <Shell refresh={refresh}>
      <div className="grid gap-10 lg:grid-cols-[320px_1fr]">
        <div className="rounded-2xl border border-line bg-panel p-3">
          {encoded && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={artUrl(base, encoded, "preview")} alt="Your design" className="w-full rounded-lg" />
          )}
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest text-dim">Order {session.id.slice(-8).toUpperCase()}</p>
          <h1 className="serif mt-2 text-4xl">
            {paid ? "Thank you — it’s on its way to the lab." : session.status === "open" ? "Payment not completed yet." : "This order wasn’t paid."}
          </h1>
          <p className="mt-4 text-dim">{describeDesign(design)} · size {(session.metadata?.size ?? "").toUpperCase()} · qty {session.metadata?.qty ?? 1}</p>
          {session.customer_details?.email && <p className="mt-1 text-dim">Confirmation sent to {session.customer_details.email}.</p>}

          <div className="mt-8 rounded-2xl border border-line bg-panel p-5">
            <h2 className="text-xs uppercase tracking-widest text-dim">Fulfilment</h2>
            {!paid && <p className="mt-2">Nothing is sent to the printer until payment succeeds.</p>}
            {paid && !order && !fulfilError && <p className="mt-2">Handing your artwork to the print lab… this page refreshes automatically.</p>}
            {fulfilError && <p className="mt-2 text-red-400">We hit a snag sending this to the lab; we’ll retry automatically. ({fulfilError.slice(0, 160)})</p>}
            {order && (
              <dl className="mt-3 grid grid-cols-[140px_1fr] gap-y-2 text-sm">
                <dt className="text-dim">Lab order</dt><dd className="font-mono">{order.id}</dd>
                <dt className="text-dim">Status</dt><dd>{stage === "InProgress" ? "In production" : stage}{order.status.details?.shipping ? ` · shipping ${order.status.details.shipping}` : ""}</dd>
                <dt className="text-dim">Shipping</dt><dd>{order.shippingMethod}</dd>
                <dt className="text-dim">Ship to</dt>
                <dd>{order.recipient.name}, {order.recipient.address.line1}, {order.recipient.address.townOrCity} {order.recipient.address.postalOrZipCode}, {order.recipient.address.countryCode}</dd>
                {shipment?.tracking && (<><dt className="text-dim">Tracking</dt><dd><a className="underline" href={shipment.tracking.url} target="_blank" rel="noreferrer">{shipment.tracking.number}</a></dd></>)}
                {order.status.issues?.length > 0 && (<><dt className="text-dim">Issues</dt><dd className="text-red-400">{order.status.issues.map((i) => i.description).join("; ")}</dd></>)}
              </dl>
            )}
            {prodigiIsSandbox() && <p className="mt-3 text-xs text-dim">Sandbox mode: the lab receives this order but will not print or ship it.</p>}
          </div>
          <p className="mt-6 text-sm text-dim">Keep this link to check on your order any time.</p>
          <Link href="/" className="mt-8 inline-block text-sm underline">Design another</Link>
        </div>
      </div>
    </Shell>
  );
}

function Shell({ children, refresh }: { children: React.ReactNode; refresh?: boolean }) {
  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-10 sm:px-8">
      {refresh && <meta httpEquiv="refresh" content="10" />}
      <Link href="/" className="text-sm tracking-[0.3em] uppercase">Orbital</Link>
      <div className="mt-10">{children}</div>
    </main>
  );
}
