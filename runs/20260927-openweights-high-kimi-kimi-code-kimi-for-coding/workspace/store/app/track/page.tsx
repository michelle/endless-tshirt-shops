import { Suspense } from "react";
import TrackGate from "./TrackGate";

export default function TrackPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-md px-5 py-24 text-center text-[#1d1a15]/60">
          Loading...
        </div>
      }
    >
      <TrackGate />
    </Suspense>
  );
}
