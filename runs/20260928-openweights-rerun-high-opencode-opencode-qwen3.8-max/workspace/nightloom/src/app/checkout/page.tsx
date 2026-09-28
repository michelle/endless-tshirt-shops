import type { Metadata } from 'next';
import CheckoutForm from '@/components/CheckoutForm';

export const metadata: Metadata = {
  title: 'Checkout — Nightloom',
  robots: { index: false },
};

export default function CheckoutPage() {
  return (
    <div className="mx-auto max-w-6xl px-5 md:px-8 pt-12 md:pt-16">
      <div className="mb-8">
        <div className="divider-star text-[11px] tracked mb-4">checkout</div>
        <h1 className="font-display text-[26px] md:text-[34px] tracking-[0.08em] uppercase">
          Almost <span className="gold">yours</span>
        </h1>
      </div>
      <CheckoutForm />
    </div>
  );
}
