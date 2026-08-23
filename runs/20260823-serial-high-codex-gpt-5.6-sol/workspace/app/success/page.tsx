import { Suspense } from "react";
import { SuccessView } from "@/components/success-view";

export default function SuccessPage() {
  return (
    <Suspense fallback={<div className="success-shell"><p className="success-kicker">LOADING YOUR MOMENT…</p></div>}>
      <SuccessView />
    </Suspense>
  );
}
