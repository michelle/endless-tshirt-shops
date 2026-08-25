'use client';

import Link from 'next/link';
import { useState } from 'react';

import { Checkout, type CompletedOrder } from './Checkout';
import { Shirt } from './Shirt';
import { describeTimestamp } from '@/lib/format';
import {
  PRICE_CENTS,
  SIZE_IDS,
  STYLES,
  STYLE_IDS,
  formatMoney,
  type SizeId,
  type StyleId,
} from '@/lib/product';

export function Store({ initialMs }: { initialMs: number }) {
  const [style, setStyle] = useState<StyleId>('fitted');
  const [size, setSize] = useState<SizeId>('M');
  const [lockedMs, setLockedMs] = useState<number | null>(null);
  const [order, setOrder] = useState<CompletedOrder | null>(null);

  const reset = () => {
    setOrder(null);
    setLockedMs(null);
  };

  return (
    <div className="layout">
      <div>
        <Shirt style={style} initialMs={initialMs} lockedMs={lockedMs} />
        <p className="stampline">
          {lockedMs ? (
            <>
              {order ? 'Yours: ' : 'Locked in: '}
              <b>{describeTimestamp(lockedMs)}</b>
            </>
          ) : (
            <>Every millisecond is a different shirt. Pick one and we print that exact number.</>
          )}
        </p>
      </div>

      <div className="panel">
        {order ? (
          <Success order={order} lockedMs={lockedMs} onReset={reset} />
        ) : (
          <>
            <Chips
              legend="Cut"
              hint={STYLES[style].garment}
              columns={2}
              name="style"
              options={STYLE_IDS.map((id) => ({ id, label: STYLES[id].label }))}
              value={style}
              onChange={(value) => setStyle(value as StyleId)}
            />
            <Chips
              legend="Size"
              columns={5}
              name="size"
              options={SIZE_IDS.map((id) => ({ id, label: id }))}
              value={size}
              onChange={(value) => setSize(value as SizeId)}
            />

            {lockedMs === null ? (
              <>
                <button className="btn" type="button" onClick={() => setLockedMs(Date.now())}>
                  Buy this millisecond — {formatMoney(PRICE_CENTS)}
                </button>
                <p className="terms">
                  Free worldwide-ish shipping, printed on demand, 5–10 business days. The clock
                  stops the moment you press the button.
                </p>
              </>
            ) : (
              <>
                <div className="locked">
                  <div>
                    <div className="locked-stamp">{lockedMs}</div>
                    <div className="locked-meta">{describeTimestamp(lockedMs)}</div>
                  </div>
                  <button className="btn btn-quiet" type="button" onClick={() => setLockedMs(Date.now())}>
                    grab a newer one
                  </button>
                </div>
                <Checkout
                  epochMs={lockedMs}
                  style={style}
                  size={size}
                  onComplete={setOrder}
                  onStaleTimestamp={() => setLockedMs(Date.now())}
                />
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Chips({
  legend,
  hint,
  columns,
  name,
  options,
  value,
  onChange,
}: {
  legend: string;
  hint?: string;
  columns: 2 | 5;
  name: string;
  options: { id: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <fieldset>
      <legend className="field-label" style={{ width: '100%' }}>
        {legend}
        {hint ? <span>{hint}</span> : null}
      </legend>
      <div className="chips" data-cols={columns}>
        {options.map((option) => (
          <div className="chip" key={option.id}>
            <input
              id={`${name}-${option.id}`}
              type="radio"
              name={name}
              value={option.id}
              checked={value === option.id}
              onChange={() => onChange(option.id)}
            />
            <label htmlFor={`${name}-${option.id}`}>{option.label}</label>
          </div>
        ))}
      </div>
    </fieldset>
  );
}

function Success({
  order,
  lockedMs,
  onReset,
}: {
  order: CompletedOrder;
  lockedMs: number | null;
  onReset: () => void;
}) {
  return (
    <div className="success">
      <h2>Congrats on your pretty cool shirt!</h2>
      <p>
        A receipt is on its way to your inbox. We print on demand, so it ships in about 5–10
        business days.
      </p>

      <div className="receipt">
        <dl>
          {lockedMs ? (
            <>
              <dt>Printed number</dt>
              <dd className="mono">{lockedMs}</dd>
            </>
          ) : null}
          <dt>Paid</dt>
          <dd>{formatMoney(PRICE_CENTS)}</dd>
          <dt>Payment</dt>
          <dd className="mono">{order.paymentIntentId}</dd>
          <dt>Print order</dt>
          <dd className="mono">
            {order.printOrderId ?? 'queueing — check your order page in a moment'}
          </dd>
        </dl>
      </div>

      {order.fulfillmentPending ? (
        <div className="alert alert-info">
          Your payment went through. The print order is still being queued — nothing else for you
          to do, and it will show up on your order page.
        </div>
      ) : null}

      <p>
        <Link
          href={`/order/${order.paymentIntentId}?payment_intent_client_secret=${encodeURIComponent(order.clientSecret)}`}
        >
          Track this order
        </Link>
      </p>

      <button className="btn" type="button" onClick={onReset} style={{ marginTop: 18 }}>
        ♥ Get another shirt
      </button>
    </div>
  );
}
