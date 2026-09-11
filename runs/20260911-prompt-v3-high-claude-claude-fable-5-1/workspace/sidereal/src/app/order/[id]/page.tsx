import Link from "next/link";
import { getOrder } from "@/lib/orders";
import { fulfillCheckoutSession } from "@/lib/fulfill";
import { stripe } from "@/lib/stripe";
import { buildSkyMapSvg } from "@/lib/skymap";
import { ShirtMockup } from "@/components/ShirtMockup";
import { getGarment } from "@/lib/catalog";
import { OrderStatus } from "./OrderStatus";
import { isSandbox } from "@/lib/prodigi";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default async function OrderPage({ params }: PageProps<"/order/[id]">) {
  const { id } = await params;
  if (!/^cs_[A-Za-z0-9_]+$/.test(id)) return <NotFound />;

  // Normally the Stripe webhook creates the record within a few seconds of
  // payment. If there's no record yet (webhook slow or misconfigured) we fall
  // back to fulfilling from here. fulfillCheckoutSession waits for any
  // in-flight worker and Prodigi de-duplicates by idempotency key regardless.
  let order = await getOrder(id);
  let fallbackError: string | null = null;
  if (!order) {
    await sleep(2500);
    order = await getOrder(id);
  }
  if (!order || order.status !== "submitted") {
    try {
      order = await fulfillCheckoutSession(id);
    } catch (err) {
      fallbackError = err instanceof Error ? err.message : String(err);
      order = await getOrder(id);
    }
  }

  if (!order) {
    // Not paid (or unknown session): show a gentle message rather than a 404.
    const session = await stripe().checkout.sessions.retrieve(id).catch(() => null);
    if (!session) return <NotFound />;
    return (
      <div className="mx-auto max-w-2xl px-5 py-16">
        <p className="eyebrow mb-2">Order</p>
        <h1 className="font-display text-4xl text-star">Payment not completed</h1>
        <p className="mt-4 text-mist">
          This checkout session is <span className="font-mono">{session.payment_status}</span>. Nothing has been printed and
          nothing has been charged.
        </p>
        {fallbackError && <p className="mt-2 text-xs text-red-400">{fallbackError}</p>}
        <Link href="/design" className="btn-ghost mt-8">
          Back to the studio
        </Link>
      </div>
    );
  }

  const svg = buildSkyMapSvg(order.design, { transparent: true });
  const garment = getGarment(order.design.garment);
  return (
    <div className="mx-auto max-w-5xl px-5 py-12">
      <div className="grid gap-10 md:grid-cols-[1fr_1.2fr]">
        <div className="rounded-lg border border-line bg-panel p-4">
          <ShirtMockup garment={order.design.garment} svg={svg} />
        </div>
        <div>
          <p className="eyebrow mb-2">Thank you{order.customerName ? `, ${order.customerName.split(" ")[0]}` : ""}</p>
          <h1 className="font-display text-4xl text-star">Your sky is on its way to the printer.</h1>
          <p className="mt-3 text-mist">
            {order.quantity} × {garment.label} tee, size {order.size.toUpperCase()} — the sky over{" "}
            <span className="text-fog">{order.design.place || "your place"}</span> on {order.design.date} at {order.design.time}.
            {order.email && (
              <>
                {" "}
                A receipt from Stripe has been sent to <span className="font-mono text-xs">{order.email}</span>.
              </>
            )}
          </p>

          <OrderStatus id={order.id} initial={order} />

          {isSandbox() && (
            <p className="mt-6 rounded-md border border-gold/40 bg-gold/5 p-3 text-xs text-gold">
              Sandbox mode: this order was submitted to Prodigi&apos;s sandbox and will not actually be printed or shipped.
            </p>
          )}

          <div className="mt-8 flex flex-wrap gap-3 text-xs text-mist">
            <span className="font-mono">Order ref {order.id.slice(-12)}</span>
            {order.printUrl && (
              <a className="underline hover:text-fog" href={order.printUrl} target="_blank" rel="noreferrer">
                Print file sent to Prodigi
              </a>
            )}
            <Link className="underline hover:text-fog" href={`/design?d=${order.designEncoded}`}>
              Make another from this design
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-16">
      <h1 className="font-display text-4xl text-star">We can&apos;t find that order.</h1>
      <Link href="/design" className="btn-ghost mt-8">
        Back to the studio
      </Link>
    </div>
  );
}
