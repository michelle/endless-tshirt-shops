import { Suspense } from 'react';
import CheckoutForm from './CheckoutForm';

export const metadata = {
  title: 'Checkout — Sidereal',
};

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="narrow">Loading…</div>}>
      <CheckoutForm />
    </Suspense>
  );
}
