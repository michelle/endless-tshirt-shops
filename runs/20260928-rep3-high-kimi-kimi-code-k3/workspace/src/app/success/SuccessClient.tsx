"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

type State =
  | { kind: "working" }
  | { kind: "done"; prodigiOrderId?: string; already: boolean }
  | { kind: "error"; message: string };

export default function SuccessClient() {
  const params = useSearchParams();
  const sessionId = params.get("session_id");
  const [state, setState] = useState<State>({ kind: "working" });

  useEffect(() => {
    if (!sessionId) {
      setState({ kind: "error", message: "No checkout session found in the URL." });
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/fulfill", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_id: sessionId }),
        });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) throw new Error(data.error || "Could not confirm your order");
        setState({
          kind: "done",
          prodigiOrderId: data.prodigiOrderId,
          already: data.status === "already_fulfilled",
        });
      } catch (e) {
        if (!cancelled) {
          setState({
            kind: "error",
            message:
              (e instanceof Error ? e.message : "Something went wrong") +
              " If your payment went through, your shirt is still queued by our payment webhook — no need to pay again.",
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  return (
    <div className="status-page">
      <div className="status-card">
        {state.kind === "working" && (
          <>
            <div className="spinner" />
            <h1>Confirming your order…</h1>
            <p>We&apos;re sending your one-of-a-kind sky to the print house.</p>
          </>
        )}
        {state.kind === "done" && (
          <>
            <h1>Your sky is going to print.</h1>
            <p>
              Payment received — your custom star map tee is now in the print queue and will ship to the
              address you entered at checkout. You&apos;ll get a confirmation email from us shortly.
            </p>
            {state.prodigiOrderId && (
              <p className="order-ref">Print order reference: {state.prodigiOrderId}</p>
            )}
            <div className="actions">
              <a className="cta" href="/">
                Design another sky
              </a>
            </div>
          </>
        )}
        {state.kind === "error" && (
          <>
            <h1>Almost there</h1>
            <p>{state.message}</p>
            <div className="actions">
              <a className="cta" href="/">
                Back to the store
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
