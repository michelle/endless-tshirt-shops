'use client';

import { useCallback, useRef, useState } from 'react';
import Checkout, { type OrderSnapshot } from '@/components/Checkout';
import ShirtPreview from '@/components/ShirtPreview';
import { SIZES, STYLES, STYLE_IDS, type ShirtSize, type ShirtStyle } from '@/lib/product';

type Props = {
  publishableKey: string;
  testMode: boolean;
};

export default function Store({ publishableKey, testMode }: Props) {
  const [style, setStyle] = useState<ShirtStyle>('fitted');
  const [size, setSize] = useState<ShirtSize>('M');
  const [frozenAt, setFrozenAt] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [order, setOrder] = useState<OrderSnapshot | null>(null);
  // Bumped after a completed sale so Checkout remounts and opens a fresh
  // PaymentIntent rather than reusing the one that was just paid.
  const [round, setRound] = useState(0);
  const frozenRef = useRef<number | null>(null);

  /**
   * The moment of purchase is the product, so it is captured exactly once per
   * attempt and then held: a declined card should not cost you your millisecond.
   */
  const freeze = useCallback(() => {
    if (frozenRef.current === null) {
      frozenRef.current = Date.now();
      setFrozenAt(frozenRef.current);
    }
    return frozenRef.current;
  }, []);

  const release = useCallback(() => {
    frozenRef.current = null;
    setFrozenAt(null);
  }, []);

  const startOver = useCallback(() => {
    release();
    setOrder(null);
    setRound((value) => value + 1);
  }, [release]);

  const optionsLocked = busy || order !== null;

  return (
    <div className="layout">
      <ShirtPreview style={style} frozenAt={frozenAt} />

      <div className="checkout">
        <fieldset className="field-set" disabled={optionsLocked}>
          <legend className="field-legend">Cut</legend>
          <div className="chooser styles">
            {STYLE_IDS.map((id) => (
              <div key={id} style={{ position: 'relative' }}>
                <input
                  id={`style-${id}`}
                  type="radio"
                  name="style"
                  value={id}
                  checked={style === id}
                  onChange={() => setStyle(id)}
                />
                <label htmlFor={`style-${id}`}>{STYLES[id].label}</label>
              </div>
            ))}
          </div>
          <p className="style-note">{STYLES[style].blurb} · black · direct-to-garment print</p>
        </fieldset>

        <fieldset className="field-set" disabled={optionsLocked}>
          <legend className="field-legend">Size</legend>
          <div className="chooser sizes">
            {SIZES.map((value) => (
              <div key={value} style={{ position: 'relative' }}>
                <input
                  id={`size-${value}`}
                  type="radio"
                  name="size"
                  value={value}
                  checked={size === value}
                  onChange={() => setSize(value)}
                />
                <label htmlFor={`size-${value}`}>{value}</label>
              </div>
            ))}
          </div>
        </fieldset>

        <Checkout
          key={round}
          publishableKey={publishableKey}
          testMode={testMode}
          style={style}
          size={size}
          frozenAt={frozenAt}
          order={order}
          onFreeze={freeze}
          onRelease={release}
          onBusyChange={setBusy}
          onComplete={setOrder}
          onStartOver={startOver}
        />
      </div>
    </div>
  );
}
