import Link from "next/link";
import { notFound } from "next/navigation";
import type Stripe from "stripe";
import { Blooms } from "@/components/bits";
import { OrderShirt } from "@/components/OrderShirt";
import { COLORWAYS, FITS, formatMoney, SHIPPING } from "@/lib/catalog";
import { summarize } from "@/lib/dialects";
import { fulfil } from "@/lib/fulfill";
import { artworkPath, fromMetadata, orderRef } from "@/lib/order";
import { hasStripe, stripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function OrderPage({ params, searchParams }: Props) {
  const { id } = await params;
  const query = await searchParams;
  if (!hasStripe()) notFound();

  const secret = typeof query.payment_intent_client_secret === "string"
    ? query.payment_intent_client_secret
    : null;

  let intent: Stripe.PaymentIntent;
  try {
    intent = await stripe().paymentIntents.retrieve(id);
  } catch {
    notFound();
  }

  // The client secret is the receipt: without it, this page is nobody's.
  if (!secret || intent.client_secret !== secret) notFound();

  const spec = fromMetadata(intent.metadata);
  if (!spec) notFound();

  const paid = intent.status === "succeeded";

  // The webhook is the real fulfilment path. This is the safety net for when a
  // webhook is slow, or has not been wired up yet.
  let fulfilment = intent.metadata?.ds_prodigiOrderId ?? null;
  let fulfilmentError: string | null = null;
  if (paid && !fulfilment) {
    try {
      const result = await fulfil(stripe(), intent);
      if (result.status !== "skipped") fulfilment = result.prodigiOrderId;
      else fulfilmentError = result.reason;
    } catch (error) {
      fulfilmentError = error instanceof Error ? error.message : String(error);
      console.error("[order page] fulfilment", error);
    }
  }

  const fit = FITS[spec.fit];
  const colorway = COLORWAYS[spec.colorway];
  const ref = orderRef(intent.id);

  return (
    <>
      <Blooms />
      <main className="mx-auto w-full max-w-[1000px] px-5 py-10 sm:py-16">
        <Link href="/" className="stamp text-[10px] text-ink-faint hover:text-ink">
          ← datetime.store
        </Link>

        <div className="mt-8 grid gap-10 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:gap-14">
          <div>
            <OrderShirt
              fit={spec.fit}
              colorway={spec.colorway}
              printUrl={artworkPath(spec, 1400)}
            />
          </div>

          <div>
            <div className="stamp mb-3 text-[10px] text-flame">
              {paid ? "sealed and paid for" : `payment ${intent.status.replace(/_/g, " ")}`}
            </div>
            <h1 className="font-display text-[clamp(2.2rem,5vw,3.4rem)] leading-[0.98]">
              {paid ? (
                <>
                  That moment is <em className="italic text-flame">yours</em>.
                </>
              ) : (
                <>We are still waiting on your bank.</>
              )}
            </h1>

            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-ink-soft">
              {paid
                ? "Nobody else will ever get this one. A receipt is on its way to your inbox, and the print house has the file."
                : "Nothing has been printed yet. If this does not settle in a minute or two, the payment did not go through and you can start again."}
            </p>

            <dl className="mt-8 divide-y divide-paper-edge border-y border-paper-edge font-mono text-[12.5px]">
              <Row label="Order">{ref}</Row>
              <Row label="The moment">
                <span className="break-all">{summarize(spec.dialect, spec.epochMs, spec.timeZone)}</span>
              </Row>
              <Row label="Shirt">
                {colorway.name} {fit.name}, size {fit.sizeLabels[spec.size] ?? spec.size.toUpperCase()}
              </Row>
              <Row label="Post">{SHIPPING[spec.shipping].name}</Row>
              <Row label="Paid">{formatMoney(intent.amount, intent.currency)}</Row>
              <Row label="Print job">
                {fulfilment ? (
                  <span className="text-moss">{fulfilment}</span>
                ) : paid ? (
                  <span className="text-ink-faint">queued — this page will show it once accepted</span>
                ) : (
                  <span className="text-ink-faint">—</span>
                )}
              </Row>
            </dl>

            {fulfilmentError && (
              <p className="mt-4 rounded-[10px] border border-flame/30 bg-flame/8 px-3 py-2.5 font-mono text-[11px] leading-relaxed text-flame">
                The print house has not accepted this order yet. We keep retrying; nothing is lost.
                <span className="mt-1 block opacity-70">{fulfilmentError.slice(0, 240)}</span>
              </p>
            )}

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/"
                className="group relative overflow-hidden rounded-full bg-ink px-6 py-3.5 text-paper"
              >
                <span className="stamp relative z-10 text-[11px]">Catch another moment</span>
                <span className="absolute inset-0 -translate-x-full bg-flame transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-0" />
              </Link>
              <a
                href={artworkPath(spec)}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-[11px] text-ink-faint underline underline-offset-4 hover:text-ink"
              >
                download the print file
              </a>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-6 py-3">
      <dt className="stamp w-24 shrink-0 text-[10px] text-ink-faint">{label}</dt>
      <dd className="min-w-0 flex-1">{children}</dd>
    </div>
  );
}
