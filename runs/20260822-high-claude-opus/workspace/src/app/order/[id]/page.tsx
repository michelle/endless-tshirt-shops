import Link from 'next/link';
import type { Metadata } from 'next';

import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import OrderStatus from '@/components/OrderStatus';
import { stripe } from '@/lib/stripe';
import { fulfillPaymentIntent } from '@/lib/fulfill';
import { getOrderView } from '@/lib/orderView';

export const metadata: Metadata = {
  title: 'Your order — datetime.store',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function OrderPage({ params, searchParams }: Props) {
  const { id } = await params;
  const query = await searchParams;
  const clientSecret =
    first(query.payment_intent_client_secret) ?? first(query.client_secret);

  let body: React.ReactNode;

  if (!id.startsWith('pi_') || !clientSecret) {
    body = (
      <Notice title="We can't show this order.">
        This link is missing the token that proves it&apos;s yours. Use the link from the
        confirmation email, or start a new order.
      </Notice>
    );
  } else {
    let intent;
    try {
      intent = await stripe().paymentIntents.retrieve(id);
    } catch {
      intent = null;
    }

    if (!intent || intent.client_secret !== clientSecret) {
      body = (
        <Notice title="We can't show this order.">
          That order reference and token don&apos;t match anything we have.
        </Notice>
      );
    } else {
      // Placing the print order here as well as in the webhook means a fresh
      // deployment fulfills correctly before any webhook is configured.
      const fulfillment = await fulfillPaymentIntent(intent);
      body = (
        <OrderStatus
          initialOrder={getOrderView(intent, fulfillment)}
          clientSecret={clientSecret}
        />
      );
    }
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 pb-16 sm:px-8">{body}</main>
      <SiteFooter />
    </>
  );
}

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <p className="mt-2 text-sm text-slate-600">{children}</p>
      <Link
        href="/"
        className="mt-5 inline-flex rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
      >
        Back to the store
      </Link>
    </div>
  );
}
