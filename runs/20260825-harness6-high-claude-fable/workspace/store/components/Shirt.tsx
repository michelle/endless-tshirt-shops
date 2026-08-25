'use client';

import { useEffect, useRef } from 'react';
import {
  ORIGINAL_PRICE_CENTS,
  PRICE_CENTS,
  ShirtStyle,
} from '@/lib/products';

// T-shirt silhouettes from the original datetime.store.
const FITTED_PATH =
  'M79.312,15.149c-1.629-1.631-16.117-6.146-16.117-6.146s-4.31,8.721-11.66,8.721s-11.66-8.721-11.66-8.721 s-15.354,4.936-16.486,6.068c-1.13,1.13-13.712,16.992-13.712,16.992l10.081,8.37l6.614-5.518c0,0,14.411,23.971,1.384,58.875 c0,0,43.546,10.767,47.434,0c-9.689-43.26,1.379-58.613,1.379-58.613l6.267,5.228l9.35-11.117 C92.185,29.288,80.945,16.781,79.312,15.149z';
const UNISEX_PATH =
  'M79.313,6.142C77.683,4.511,63.196,4,63.196,4s-9.844,13.724-11.661,13.724 C49.719,17.724,39.875,4,39.875,4S24.521,4.932,23.389,6.064c-1.13,1.13-22.827,24.89-22.827,24.89L16.71,42.975l9.662-8.06 l1.384,58.875c0,0,43.541,10.705,47.433,0l1.379-58.613l9.347,7.797L100,30.953C100,30.953,80.945,7.774,79.313,6.142z';

function dollars(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function Shirt({
  style,
  frozenTimestamp,
}: {
  style: ShirtStyle;
  frozenTimestamp: string | null;
}) {
  const timeRef = useRef<HTMLSpanElement>(null);
  const frozenRef = useRef(frozenTimestamp);
  frozenRef.current = frozenTimestamp;

  useEffect(() => {
    let raf: number;
    const tick = () => {
      if (timeRef.current) {
        timeRef.current.textContent =
          frozenRef.current ?? Date.now().toString();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="Shirt">
      <div className={`Shirt-time${frozenTimestamp ? ' is-frozen' : ''}`}>
        <span ref={timeRef}>{frozenTimestamp ?? ''}</span>
        <span className="Shirt-time-caption">
          {frozenTimestamp ? 'your moment, frozen' : 'ms since epoch · live'}
        </span>
      </div>
      <svg
        className="Shirt-svg"
        viewBox="0 0 100 125"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label={`Black ${style} t-shirt printed with the current datetime`}
      >
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d={style === 'fitted' ? FITTED_PATH : UNISEX_PATH}
        />
      </svg>
      <div className="Shirt-price">
        <span className="price-label">
          <s>{dollars(ORIGINAL_PRICE_CENTS)}</s> {dollars(PRICE_CENTS)}
        </span>
      </div>
    </div>
  );
}
