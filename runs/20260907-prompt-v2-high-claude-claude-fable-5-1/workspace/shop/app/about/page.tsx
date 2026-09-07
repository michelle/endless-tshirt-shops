import { DESIGNS } from "@/lib/catalog";
import Link from "next/link";

export const metadata = { title: "About — The Obsolete Guild" };

export default function About() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-4xl">About the guild</h1>
      <p className="mt-6 text-lg text-ink/85">
        Union badges used to be everywhere: on jackets, on lunch pails, on the front of the hall. They said <em>this work matters and there are a lot of us</em>.
        The Obsolete Guild makes badges for the trades that never got a farewell party. The lamplighter who lit forty streets a night. The woman who computed
        the return of a comet by hand. The lad who reset bowling pins for a nickel a line.
      </p>
      <p className="mt-4 text-lg text-ink/85">
        Each design is an original illustration with a founding year taken from the trade&apos;s actual history, a local number, and a motto the members would have
        argued about. Ten locals so far. More get chartered whenever a job disappears, which, lately, is often.
      </p>

      <h2 className="mt-12 font-display text-2xl">The roll of locals</h2>
      <ul className="mt-4 divide-y divide-ink/15">
        {DESIGNS.map((d) => (
          <li key={d.slug} className="flex items-baseline justify-between gap-4 py-3">
            <div>
              <Link href={`/shirts/${d.slug}`} className="font-medium hover:underline">{d.name}</Link>
              <div className="text-sm text-ink/65">Retired by: {d.obsoletedBy}</div>
            </div>
            <div className="font-mono text-xs uppercase tracking-widest text-ink/60">{d.est}</div>
          </li>
        ))}
      </ul>

      <h2 id="shipping" className="mt-12 scroll-mt-24 font-display text-2xl">Shipping &amp; returns</h2>
      <div className="mt-4 space-y-3 text-ink/85">
        <p>Shirts are printed to order and dispatched from the print lab nearest you, typically within 2–4 working days. Standard shipping is quoted at checkout for your country before you pay.</p>
        <p>Because each shirt is made for you we can&apos;t take returns for a change of mind, but if anything arrives damaged or misprinted, email us within 30 days with a photo and we&apos;ll reprint it free.</p>
        <p>Shirts are unisex Bella + Canvas 3001, 100% ring-spun cotton (heathers are a cotton/poly blend). They fit true to size. If in doubt, size up; that&apos;s what the pinsetters did.</p>
      </div>
    </div>
  );
}
