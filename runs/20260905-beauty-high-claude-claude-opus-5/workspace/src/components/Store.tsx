"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  COLORWAYS,
  COLORWAY_IDS,
  FITS,
  FIT_IDS,
  formatMoney,
  PRICE,
  SHIPPING,
  type ColorwayId,
  type FitId,
  type ShippingId,
} from "@/lib/catalog";
import { DIALECTS, DIALECT_IDS, summarize, type DialectId } from "@/lib/dialects";
import { Checkout } from "./Checkout";
import { Label, LiveClock } from "./bits";
import { PrintArt } from "./PrintArt";
import { Shirt } from "./Shirt";

type Session = {
  clientSecret: string;
  paymentIntentId: string;
  amount: number;
  allowedCountries: string[];
  /** Signed URL of the actual file the printer will receive. */
  artworkUrl: string;
};

export function Store() {
  const [dialect, setDialect] = useState<DialectId>("epoch");
  const [fit, setFit] = useState<FitId>("unisex");
  const [size, setSize] = useState("m");
  const [colorway, setColorway] = useState<ColorwayId>("midnight");
  const [shipping, setShipping] = useState<ShippingId>("standard");

  const [frozenMs, setFrozenMs] = useState<number | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeZone, setTimeZone] = useState("UTC");
  const [printUrl, setPrintUrl] = useState<string | null>(null);
  const checkoutRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
  }, []);

  // Sizes are per-fit; keep the selection legal when the fit changes.
  useEffect(() => {
    if (!FITS[fit].sizes.includes(size)) setSize(FITS[fit].sizes.includes("m") ? "m" : FITS[fit].sizes[0]);
  }, [fit, size]);

  const spec = useMemo(
    () => ({ epochMs: frozenMs ?? 0, dialect, fit, size, colorway, shipping, timeZone }),
    [frozenMs, dialect, fit, size, colorway, shipping, timeZone],
  );

  const total = PRICE.amount + SHIPPING[shipping].amount;

  const openTill = useCallback(
    async (epochMs: number, existing?: string) => {
      setPending(true);
      setError(null);
      try {
        const res = await fetch("/api/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...spec, epochMs, clientSecret: existing }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "The till would not open.");
        setSession(data);
        setPrintUrl(data.artworkUrl);
        return data as Session;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went sideways.");
        return null;
      } finally {
        setPending(false);
      }
    },
    [spec],
  );

  async function freeze() {
    const ms = Date.now();
    setFrozenMs(ms);
    const opened = await openTill(ms);
    if (opened) {
      requestAnimationFrame(() =>
        checkoutRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
      );
    }
  }

  function thaw() {
    setFrozenMs(null);
    setPrintUrl(null);
    setError(null);
  }

  // Changing the shirt after freezing has to follow through to the till and to
  // the print file. The moment itself never moves.
  useEffect(() => {
    if (frozenMs === null || !session) return;
    const id = setTimeout(() => {
      void openTill(frozenMs, session.clientSecret);
    }, 250);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialect, fit, size, colorway, shipping]);

  const c = COLORWAYS[colorway];
  const frozen = frozenMs !== null;

  return (
    <>
      <section className="mx-auto grid w-full max-w-[1220px] gap-10 px-5 pb-8 pt-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)] lg:gap-16 lg:pt-14">
        {/* ------------------------------------------------------ the shirt */}
        <div className="relative">
          <div className="mb-6 lg:mb-10">
            <h1 className="font-display text-[clamp(2.6rem,7vw,4.6rem)] leading-[0.95] tracking-tight">
              We sell a t-shirt
              <br />
              with <em className="italic text-flame">right now</em> on it.
            </h1>
            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-ink-soft">
              Every shirt is printed with the exact millisecond you decided to buy it. Pick how you
              want that written down, press the button, and that particular instant becomes cotton.
            </p>
          </div>

          <div
            className="relative mx-auto -mt-2 w-full max-w-[600px]"
            style={{ transition: "filter 400ms", filter: frozen ? "saturate(1.03)" : "none" }}
          >
            <Shirt
              fit={fit}
              colorway={colorway}
              dialect={dialect}
              timeZone={timeZone}
              frozenMs={frozenMs}
              printUrl={frozen ? printUrl : null}
            />

            {frozen && (
              <div className="pointer-events-none absolute bottom-[16%] right-[2%] rotate-[-9deg] sm:right-[6%]">
                <div className="flex h-[112px] w-[112px] flex-col items-center justify-center rounded-full border-2 border-dashed border-flame/70 bg-paper/70 text-center text-flame shadow-[0_14px_36px_-20px_rgba(255,77,46,0.9)] backdrop-blur-[2px]">
                  <div className="stamp text-[8px] leading-none opacity-70">sealed at</div>
                  <div className="mt-1 max-w-[92px] break-all font-mono text-[10px] font-bold leading-[1.15]">
                    {frozenMs}
                  </div>
                  <div className="stamp mt-1 text-[7px] leading-none opacity-70">one of one</div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 font-mono text-[11px] text-ink-faint">
            <span>{FITS[fit].blurb}</span>
            <span className="hidden sm:inline">·</span>
            <span>free worldwide shipping</span>
          </div>
        </div>

        {/* ------------------------------------------------- the spec sheet */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <div className="card perforated rounded-[18px] p-6 sm:p-7">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <div className="stamp text-[10px] text-ink-faint">the only product</div>
                <div className="font-display text-3xl leading-none">One moment, worn</div>
              </div>
              <div className="text-right">
                <div className="font-mono text-[11px] text-ink-faint line-through">
                  {formatMoney(PRICE.wasAmount)}
                </div>
                <div className="font-mono text-2xl font-bold leading-none">{formatMoney(PRICE.amount)}</div>
              </div>
            </div>

            <div className="mb-6">
              <Label note="five dialects">How to write it down</Label>
              <div className="flex flex-wrap gap-1.5">
                {DIALECT_IDS.map((id) => (
                  <button
                    key={id}
                    type="button"
                    className="chip rounded-full px-3 py-1.5"
                    data-on={dialect === id}
                    onClick={() => setDialect(id)}
                  >
                    {DIALECTS[id].name}
                  </button>
                ))}
              </div>
              <p className="mt-2.5 min-h-[2.4em] text-[13px] leading-snug text-ink-soft">
                {DIALECTS[dialect].blurb}
              </p>
            </div>

            <div className="mb-6 grid grid-cols-2 gap-5">
              <div>
                <Label>Fit</Label>
                <div className="flex gap-1.5">
                  {FIT_IDS.map((id) => (
                    <button
                      key={id}
                      type="button"
                      className="chip flex-1 rounded-full px-3 py-1.5"
                      data-on={fit === id}
                      onClick={() => setFit(id)}
                    >
                      {FITS[id].name}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label>Size</Label>
                <div className="flex flex-wrap gap-1.5">
                  {FITS[fit].sizes.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className="chip min-w-[38px] rounded-full px-2 py-1.5"
                      data-on={size === s}
                      onClick={() => setSize(s)}
                    >
                      {FITS[fit].sizeLabels[s]}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mb-6">
              <Label note={c.poetry}>Colour</Label>
              <div className="flex gap-2.5">
                {COLORWAY_IDS.map((id) => {
                  const cw = COLORWAYS[id];
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setColorway(id)}
                      aria-label={cw.name}
                      title={cw.name}
                      className="group relative h-10 w-10 rounded-full border transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5"
                      style={{
                        background: `linear-gradient(140deg, ${cw.clothLight}, ${cw.cloth} 55%, ${cw.clothShade})`,
                        borderColor: colorway === id ? "#16130f" : "rgba(22,19,15,0.14)",
                        boxShadow: colorway === id ? "0 0 0 3px rgba(22,19,15,0.1)" : undefined,
                      }}
                    />
                  );
                })}
                <div className="ml-1 flex flex-col justify-center">
                  <div className="stamp text-[10px]">{c.name}</div>
                </div>
              </div>
            </div>

            <div className="mb-7">
              <Label>Speed of light</Label>
              <div className="space-y-1.5">
                {(Object.keys(SHIPPING) as ShippingId[]).map((id) => {
                  const opt = SHIPPING[id];
                  const on = shipping === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setShipping(id)}
                      className="flex w-full items-center justify-between rounded-[10px] border px-3.5 py-2.5 text-left transition"
                      style={{
                        borderColor: on ? "#16130f" : "var(--color-paper-edge)",
                        background: on ? "rgba(22,19,15,0.04)" : "transparent",
                      }}
                    >
                      <span>
                        <span className="stamp block text-[10px]">{opt.name}</span>
                        <span className="text-[12px] text-ink-soft">{opt.detail}</span>
                      </span>
                      <span className="font-mono text-[12px]">
                        {opt.amount === 0 ? "free" : `+${formatMoney(opt.amount)}`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {!frozen ? (
              <>
                <button
                  type="button"
                  onClick={freeze}
                  disabled={pending}
                  className="group relative w-full overflow-hidden rounded-full bg-ink py-4 text-paper transition disabled:opacity-60"
                >
                  <span className="stamp relative z-10 text-[12px]">
                    {pending ? "catching it…" : "Freeze this moment"}
                  </span>
                  <span className="absolute inset-0 -translate-x-full bg-flame transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-0" />
                </button>
                <p className="mt-3 text-center font-mono text-[10px] leading-relaxed text-ink-faint">
                  the clock stops when you press it. <LiveClock className="text-[10px]" />
                </p>
              </>
            ) : (
              <div className="rounded-[12px] border border-ink/12 bg-ink/[0.03] p-4">
                <div className="stamp mb-1 text-[9px] text-ink-faint">held for you</div>
                <div className="break-all font-mono text-[13px] leading-snug">
                  {summarize(dialect, frozenMs, timeZone)}
                </div>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={thaw}
                    className="font-mono text-[11px] text-ink-faint underline underline-offset-4 hover:text-ink"
                  >
                    ← let time start again
                  </button>
                  <span className="font-mono text-[11px] text-flame">finish below ↓</span>
                </div>
              </div>
            )}

            {error && (
              <p className="mt-4 rounded-[10px] border border-flame/30 bg-flame/8 px-3 py-2.5 font-mono text-[12px] text-flame">
                {error}
              </p>
            )}

            <div className="mt-6 flex items-center justify-between border-t border-paper-edge pt-4 font-mono text-[10px] text-ink-faint">
              <span>{FITS[fit].sku}</span>
              <span className="tabular-nums">{formatMoney(total)} all in</span>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------- the till */}
      <div ref={checkoutRef} className="scroll-mt-6">
        {frozen && session && (
          <section className="mx-auto w-full max-w-[1220px] px-5 pb-16 pt-6">
            <div className="card mx-auto max-w-[560px] rounded-[18px] p-6 sm:p-8">
              <div className="mb-6 flex items-baseline justify-between">
                <h2 className="font-display text-3xl leading-none">Make it permanent</h2>
                <span className="font-mono text-[11px] text-ink-faint">{formatMoney(session.amount)}</span>
              </div>
              <Checkout
                clientSecret={session.clientSecret}
                paymentIntentId={session.paymentIntentId}
                amount={session.amount}
                allowedCountries={session.allowedCountries}
                shipping={shipping}
                returnPath={`/order/${session.paymentIntentId}`}
                onBack={thaw}
              />
            </div>
          </section>
        )}
      </div>

      <Specimens timeZone={timeZone} current={dialect} onPick={setDialect} />
    </>
  );
}

/** A sheet of every dialect, ticking away, so you can see what you're choosing. */
function Specimens({
  timeZone,
  current,
  onPick,
}: {
  timeZone: string;
  current: DialectId;
  onPick: (d: DialectId) => void;
}) {
  return (
    <section className="mx-auto w-full max-w-[1220px] px-5 pb-20">
      <div className="mb-6 flex items-end justify-between gap-4 border-b border-paper-edge pb-3">
        <h2 className="font-display text-3xl leading-none">The specimen sheet</h2>
        <span className="stamp text-[10px] text-ink-faint">all five, live</span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {DIALECT_IDS.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => onPick(id)}
            className="card group flex flex-col justify-between rounded-[14px] p-5 text-left transition hover:-translate-y-0.5"
            style={{ borderColor: current === id ? "#16130f" : undefined }}
          >
            <div className="flex items-center justify-between">
              <span className="stamp text-[10px]">{DIALECTS[id].name}</span>
              {current === id && <span className="font-mono text-[10px] text-flame">selected</span>}
            </div>
            <div className="my-6 flex min-h-[104px] items-center justify-center">
              <div className="w-[86%]">
                <PrintArt dialect={id} timeZone={timeZone} frozenMs={null} ink="#16130f" hz={12} />
              </div>
            </div>
            <p className="text-[12.5px] leading-snug text-ink-soft">{DIALECTS[id].blurb}</p>
          </button>
        ))}
        <div className="card flex flex-col justify-center rounded-[14px] p-5">
          <p className="font-display text-2xl leading-tight">
            There are 86,400,000 milliseconds in a day. You are buying one of them.
          </p>
          <p className="mt-3 font-mono text-[11px] text-ink-faint">
            No two orders can share a millisecond. We checked.
          </p>
        </div>
      </div>
    </section>
  );
}
