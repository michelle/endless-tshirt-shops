'use client';

import { useState } from 'react';
import Shirt from './Shirt';
import Checkout from './Checkout';
import type { ShirtSize, ShirtStyle } from '@/lib/catalog';

export default function StoreFront() {
  const [style, setStyle] = useState<ShirtStyle>('fitted');
  const [size, setSize] = useState<ShirtSize>('M');
  /** Set once the customer commits; stops the clock on the shirt. */
  const [frozenAt, setFrozenAt] = useState<number | null>(null);

  return (
    <main className="layout">
      <div>
        <Shirt style={style} frozenAt={frozenAt} />
      </div>
      <Checkout
        style={style}
        size={size}
        onStyleChange={setStyle}
        onSizeChange={setSize}
        onFreeze={setFrozenAt}
      />
    </main>
  );
}
