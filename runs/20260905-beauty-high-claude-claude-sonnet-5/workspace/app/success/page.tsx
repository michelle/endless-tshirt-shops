import { Suspense } from 'react';
import { SuccessContent } from '@/components/SuccessContent';

export default function SuccessPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center text-white/50">
          Loading your order…
        </main>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
