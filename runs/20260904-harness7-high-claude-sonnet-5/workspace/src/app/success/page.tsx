import { Suspense } from "react";
import SuccessClient from "@/components/SuccessClient";

export default function SuccessPage() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-6 py-24">
      <Suspense fallback={<p className="text-center text-white/60">Loading…</p>}>
        <SuccessClient />
      </Suspense>
    </main>
  );
}
