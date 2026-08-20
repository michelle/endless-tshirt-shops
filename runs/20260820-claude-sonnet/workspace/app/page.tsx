'use client';

import { useState } from 'react';
import Shirt from '@/components/Shirt';
import CheckoutPanel from '@/components/CheckoutPanel';
import { ShirtSize, ShirtStyle } from '@/lib/products';

export default function Home() {
  const [style, setStyle] = useState<ShirtStyle>('fitted');
  const [size, setSize] = useState<ShirtSize>('M');
  const [checkingOut, setCheckingOut] = useState(false);

  return (
    <main className="flex-1">
      <div className="mx-auto flex max-w-5xl flex-col gap-10 px-6 py-16 sm:py-24">
        <header className="text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">datetime.store</h1>
          <p className="mt-3 text-lg text-white/60">
            We sell a t-shirt with the current datetime. That&apos;s it. That&apos;s the whole store.
          </p>
        </header>

        <div className="flex flex-col items-center gap-10 sm:flex-row sm:items-start sm:justify-center">
          <div className="flex w-full justify-center sm:w-auto">
            <Shirt style={style} disabled={checkingOut} />
          </div>
          <CheckoutPanel
            style={style}
            size={size}
            onStyleChange={setStyle}
            onSizeChange={setSize}
            onCheckingOut={setCheckingOut}
          />
        </div>

        <footer className="mt-8 text-center text-xs text-white/30">
          Fulfilled on demand by Scalable Press. Payments processed by Stripe.
        </footer>
      </div>
    </main>
  );
}
