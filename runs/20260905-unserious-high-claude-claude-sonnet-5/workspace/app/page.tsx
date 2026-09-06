"use client";

import { useEffect, useState } from "react";
import Shirt from "@/components/Shirt";
import BuyPanel from "@/components/BuyPanel";
import type { ColorId } from "@/lib/product";

const FAQS: [string, string][] = [
  [
    "Wait, you just sell a shirt with the current time on it?",
    "Yes. The exact millisecond — as an integer, milliseconds since January 1st, 1970 — printed on a shirt and shipped to your house. That's the whole business.",
  ],
  [
    "Can I pick which millisecond I get?",
    "No. You get whatever millisecond it is when you click the button. That's the point. It is the most honest product we could think of.",
  ],
  [
    "What if I don't like my millisecond?",
    "Neither do we, sometimes. Time is relentless and does not take requests.",
  ],
  [
    "Can I get a refund?",
    "You cannot return a moment. It has already happened. This is also true of most purchases, but especially this one.",
  ],
  [
    "Do you ship internationally?",
    "Yes — we ship worldwide via Prodigi's print network. Your shirt is printed with the millisecond you paid at, not the millisecond it arrives, regardless of time zone.",
  ],
  [
    "Is this a real, working store?",
    "It runs on real Stripe Checkout and a real Prodigi print order (currently pointed at sandbox environments so you can try the whole flow for free). Swap in live keys and it ships actual shirts.",
  ],
];

export default function Home() {
  const [color, setColor] = useState<ColorId>("black");
  const [canceled, setCanceled] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setCanceled(params.get("canceled") === "1");
  }, []);

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-24 px-6 pb-32 pt-10 sm:px-10">
      <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div className="font-display text-lg font-bold tracking-tight">
          datetime<span className="text-stamp">.</span>store
        </div>
        <nav className="flex items-center gap-4 text-sm text-ink/60 sm:gap-5">
          <a href="#how" className="hidden hover:text-ink sm:inline">
            How it works
          </a>
          <a href="#faq" className="hidden hover:text-ink sm:inline">
            FAQ
          </a>
          <span className="whitespace-nowrap rounded-full border border-ink/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-ink/50 sm:text-xs">
            Sandbox mode
          </span>
        </nav>
      </header>

      {canceled && (
        <div className="-mb-16 rounded-lg border border-stamp/30 bg-stamp/10 px-4 py-3 text-sm text-ink">
          Your moment escaped. Time waits for no one, but the shirt is still
          $22.50 whenever you're ready.
        </div>
      )}

      <section className="grid grid-cols-1 items-center gap-16 md:grid-cols-2">
        <div className="order-2 md:order-1">
          <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">
            We sell a t‑shirt
            <br />
            with the current
            <br />
            <span className="text-stamp">datetime</span> on it.
          </h1>
          <p className="mt-6 max-w-md text-lg text-ink/70">
            Every millisecond that passes is gone forever. For $22.50 we
            will print the exact millisecond you check out at onto a shirt
            and mail it to you, so at least one of them sticks around.
          </p>
          <p className="mt-4 text-sm text-ink/50">
            It will never be this time again. Act accordingly.
          </p>
        </div>
        <div className="order-1 md:order-2">
          <Shirt color={color} />
        </div>
      </section>

      <section className="grid grid-cols-1 items-start gap-16 md:grid-cols-2">
        <div className="hidden md:block">
          <blockquote className="max-w-sm border-l-2 border-stamp/40 pl-5 text-ink/60">
            &ldquo;Every shirt is a limited edition of exactly one, ever
            printed, at exactly one millisecond, for exactly one
            person.&rdquo;
            <footer className="mt-2 text-xs uppercase tracking-[0.2em] text-ink/40">
              — the entire product philosophy
            </footer>
          </blockquote>
        </div>
        <BuyPanel color={color} onColorChange={setColor} />
      </section>

      <section id="how" className="grid grid-cols-1 gap-10 sm:grid-cols-3">
        {[
          [
            "01",
            "Pick a color & size",
            "Cosmetic. Does not affect the number.",
          ],
          [
            "02",
            "Click buy",
            "Date.now() fires the instant you click. That's your millisecond, forever.",
          ],
          [
            "03",
            "We print & ship it",
            "Stripe takes the payment, Prodigi prints and ships a real shirt to your door.",
          ],
        ].map(([n, title, body]) => (
          <div key={n}>
            <div className="font-mono text-sm text-stamp">{n}</div>
            <h3 className="mt-1 font-display text-lg font-bold">{title}</h3>
            <p className="mt-1 text-sm text-ink/60">{body}</p>
          </div>
        ))}
      </section>

      <section id="faq" className="mx-auto w-full max-w-2xl">
        <h2 className="mb-6 text-center font-display text-2xl font-bold">
          Frequently asked, understandably
        </h2>
        <div className="divide-y divide-ink/10 border-y border-ink/10">
          {FAQS.map(([q, a]) => (
            <details key={q} className="group py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between font-medium">
                {q}
                <span className="ml-4 text-ink/40 transition group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-2 text-sm text-ink/60">{a}</p>
            </details>
          ))}
        </div>
      </section>

      <Footer />
    </main>
  );
}

function Footer() {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <footer className="flex flex-col items-center gap-2 border-t border-ink/10 pt-8 text-center text-xs text-ink/40">
      <div className="font-mono tabular-nums">
        © datetime.store — all rights reserved as of {now ?? "…"}
      </div>
      <div>
        Payments by Stripe. Printing & fulfillment by Prodigi. Not
        affiliated with the concept of time.
      </div>
    </footer>
  );
}
