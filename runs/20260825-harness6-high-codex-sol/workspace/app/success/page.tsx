import { Suspense } from "react";
import { SuccessView } from "@/components/success-view";

export default function SuccessPage() {
  return <Suspense fallback={<main className="success-shell"><div className="success-card"><p>Confirming your moment…</p></div></main>}><SuccessView /></Suspense>;
}
