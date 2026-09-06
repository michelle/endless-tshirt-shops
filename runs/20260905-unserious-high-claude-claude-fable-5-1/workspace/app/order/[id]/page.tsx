import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { stripe } from "@/lib/stripe";
import { fulfillPaymentIntent, loadProdigiOrder } from "@/lib/fulfill";
import { buildOrderStatus } from "@/lib/orderStatus";
import { OrderView } from "@/app/components/OrderView";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const metadata: Metadata = {
  title: "your shirt · datetime.store",
  robots: { index: false, follow: false },
};

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function OrderPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  const secret = typeof sp.payment_intent_client_secret === "string" ? sp.payment_intent_client_secret : null;
  if (!/^pi_[A-Za-z0-9]+$/.test(id) || !secret) notFound();

  let pi;
  try {
    pi = await stripe().paymentIntents.retrieve(id);
  } catch {
    notFound();
  }
  if (pi.client_secret !== secret) notFound();

  const result = await fulfillPaymentIntent(pi);
  const prodigiOrder = await loadProdigiOrder(result.pi);
  const status = buildOrderStatus(result, prodigiOrder);

  return <OrderView initial={status} secret={secret} />;
}
