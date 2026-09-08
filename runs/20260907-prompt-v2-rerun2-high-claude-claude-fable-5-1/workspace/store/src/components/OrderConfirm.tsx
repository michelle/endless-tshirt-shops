"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCart } from "@/lib/cart";

type State =
  | { kind: "loading" }
  | { kind: "unpaid"; status: string }
  | { kind: "error"; message: string }
  | { kind: "done"; orderId: string; email: string | null };

export function OrderConfirm() {
  const params = useSearchParams();
  const sessionId = params.get("session_id");
  const { clear } = useCart();
  const [state, setState] = useState<State>({ kind: "loading" });
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current || !sessionId) return;
    ran.current = true;
    (async () => {
      try {
        const res = await fetch("/api/orders/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Could not confirm order");
        if (!data.paid) {
          setState({ kind: "unpaid", status: data.status });
          return;
        }
        clear();
        setState({ kind: "done", orderId: data.orderId, email: data.email });
      } catch (e) {
        setState({ kind: "error", message: e instanceof Error ? e.message : "Could not confirm order" });
      }
    })();
  }, [sessionId, clear]);

  if (!sessionId) {
    return <p className="text-ink-2">Missing checkout session. <Link href="/cart" className="underline">Back to cart</Link></p>;
  }
  if (state.kind === "loading") {
    return (
      <div className="dashed p-8">
        <p className="font-slab text-2xl">Filing your order with the print lab…</p>
        <p className="mt-2 text-ink-2 text-sm">Confirming payment and submitting to Prodigi. This takes a few seconds.</p>
      </div>
    );
  }
  if (state.kind === "unpaid") {
    return (
      <div className="dashed p-8">
        <p className="font-slab text-2xl">Payment not completed</p>
        <p className="mt-2 text-ink-2 text-sm">Stripe reports this session as “{state.status}”. If you were charged, contact us with your session id.</p>
        <Link href="/cart" className="btn mt-6">Back to cart</Link>
      </div>
    );
  }
  if (state.kind === "error") {
    return (
      <div className="dashed p-8">
        <p className="font-slab text-2xl">We hit a snag confirming your order</p>
        <p className="mt-2 text-sm text-stamp font-bold">{state.message}</p>
        <p className="mt-2 text-ink-2 text-sm">
          Your payment is safe: our Stripe webhook will file the order automatically. Keep this reference: <code>{sessionId}</code>
        </p>
      </div>
    );
  }
  return (
    <div className="card p-8">
      <p className="stamp mb-4">Filed</p>
      <h2 className="font-slab text-3xl">Order received. Welcome to the Department.</h2>
      <p className="mt-3 text-ink-2">
        Your shirt has been submitted to the print lab. {state.email ? <>Shipping updates will go to <b>{state.email}</b>.</> : null}
      </p>
      <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
        <dt className="font-bold">Order number</dt>
        <dd className="font-mono">{state.orderId}</dd>
        <dt className="font-bold">Status</dt>
        <dd>Received by print lab</dd>
      </dl>
      <div className="mt-8 flex flex-wrap gap-4">
        <Link href={`/order/${state.orderId}`} className="btn">
          Track this order
        </Link>
        <Link href="/#collection" className="btn btn-outline">
          Keep shopping
        </Link>
      </div>
    </div>
  );
}
