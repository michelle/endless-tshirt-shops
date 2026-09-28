import { Suspense } from 'react';
import Designer from './Designer';

export const metadata = {
  title: 'Design your sky — Sidereal',
};

export default function DesignPage() {
  return (
    <Suspense fallback={<div className="narrow">Loading…</div>}>
      <Designer />
    </Suspense>
  );
}
