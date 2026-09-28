import type { Metadata } from 'next';
import Link from 'next/link';
import { unpack, verify } from '@/lib/encoding';
import { artworkUrl } from '@/lib/fulfillment';
import { getStripe, metadataToToken, stripeEnabled } from '@/lib/stripe';
import { validateOrder } from '@/lib/validation';
import type { OrderPayload } from '@/lib/types';
import { PALETTES } from '@/lib/palettes';
import {
  SHIPPING_PRICE_CENTS,
  SHIRT_COLORS,
  SHIRT_PRICE_CENTS,
  SHIRT_SIZES,
} from '@/lib/product';
import { formatDateLong, formatUSD } from '@/lib/format';
import SuccessClient from '@/components/SuccessClient';

export const metadata: Metadata = {
  title: 'Order confirmed — Nightloom',
  robots: { index: false },
};

export const dynamic = 'force-dynamic';

type SP = Record<string, string | string[] | undefined>;

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const sessionId = typeof sp.session_id === 'string' ? sp.session_id : '';
  const token = typeof sp.token === 'string' ? sp.token : '';
  const sig = typeof sp.sig === 'string' ? sp.sig : '';
  const demo = sp.demo === '1';

  let order: OrderPayload | null = null;
  let problem = '';

  if (sessionId && stripeEnabled()) {
    try {
      const session = await getStripe().checkout.sessions.retrieve(sessionId);
      if (session.payment_status !== 'paid') {
        problem = `Payment not completed (status: ${session.payment_status}).`;
      } else {
        const meta = metadataToToken(session.metadata);
        if (meta && verify(meta.token, meta.sig)) {
          const v = validateOrder(unpack<OrderPayload>(meta.token));
          if (v.ok) order = v.value;
          else problem = 'Order data in the payment session was invalid.';
        } else {
          problem = 'Could not verify the order attached to this payment.';
        }
      }
    } catch (err) {
      console.error('[nightloom] success page session lookup failed', err);
      problem = 'Could not retrieve the payment session.';
    }
  } else if (token && sig && verify(token, sig)) {
    const v = validateOrder(unpack<OrderPayload>(token));
    if (v.ok) order = v.value;
    else problem = 'Invalid order data.';
  } else {
    problem = 'Nothing to confirm here.';
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-2xl px-5 md:px-8 pt-20">
        <div className="panel p-10 text-center">
          <div className="font-display text-[20px] tracking-[0.18em] uppercase mb-3">
            Order not found
          </div>
          <p className="muted text-[13.5px] mb-6">{problem}</p>
          <Link href="/#studio" className="nl-btn nl-btn-ghost">Back to the studio</Link>
        </div>
      </div>
    );
  }

  const garment = SHIRT_COLORS.find((c) => c.id === order.product.color) ?? SHIRT_COLORS[0];
  const sizeLabel = SHIRT_SIZES.find((s) => s.id === order.product.size)?.label ?? order.product.size;
  const qty = order.product.qty;
  const total = qty * SHIRT_PRICE_CENTS + SHIPPING_PRICE_CENTS;
  const printFile = artworkUrl(order.design);

  return (
    <div className="mx-auto max-w-6xl px-5 md:px-8 pt-12 md:pt-16">
      <div className="text-center mb-10">
        <div className="badge mx-auto mb-5">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--ok)]" />
          {demo ? 'sandbox order · payment simulated' : 'payment confirmed'}
        </div>
        <h1 className="font-display text-[28px] md:text-[40px] tracking-[0.07em] uppercase leading-tight">
          That sky is <span className="gold">officially yours</span>
        </h1>
        <p className="mt-4 text-[13.5px] muted max-w-xl mx-auto leading-relaxed">
          Order <span className="gold">{order.orderRef}</span> is on its way to the print
          studio. Keep this page — it tracks production live.
        </p>
      </div>

      <div className="grid lg:grid-cols-[460px_1fr] gap-8 items-start">
        <div className="panel p-6">
          <div className="text-[11px] tracked muted mb-4">your print file (exactly what gets printed)</div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={printFile}
            alt={`Star map artwork for ${order.design.name}`}
            className="w-full rounded-lg border hairline"
            width={460}
            height={569}
          />
        </div>

        <div className="space-y-6">
          <SuccessClient orderRef={order.orderRef} />

          <div className="panel p-6">
            <div className="text-[11px] tracked muted mb-4">order details</div>
            <div className="grid md:grid-cols-2 gap-x-8 gap-y-2.5 text-[13px]">
              <div className="flex justify-between gap-4">
                <span className="muted">Shirt</span>
                <span>
                  {garment.label} · {sizeLabel} × {qty}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="muted">Palette</span>
                <span>{PALETTES[order.design.palette].label}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="muted">Name</span>
                <span>{order.design.name}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="muted">Caption</span>
                <span>{order.design.caption || '—'}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="muted">Night</span>
                <span>
                  {formatDateLong(order.design.date)} · {order.design.time}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="muted">Place</span>
                <span>{order.design.placeLabel}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="muted">Paid</span>
                <span className="gold">{formatUSD(total)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="muted">Ship to</span>
                <span className="text-right">
                  {order.shipping.fullName}, {order.shipping.city}, {order.shipping.country}
                </span>
              </div>
            </div>
          </div>

          <div className="panel p-6 text-[13px] muted leading-relaxed">
            <div className="text-[11px] tracked mb-3 text-[var(--ink)]">what happens next</div>
            <ol className="list-decimal ml-5 space-y-1.5">
              <li>Your print file is downloaded by the print studio (Prodigi).</li>
              <li>The tee is printed direct-to-garment at the lab nearest you.</li>
              <li>It ships to the address above — tracking appears here when it dispatches.</li>
            </ol>
            <div className="mt-5">
              <Link href="/#studio" className="nl-btn nl-btn-ghost !py-2.5 text-[11px]">
                Design another night
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
