import Link from "next/link";
import { TeePreview } from "@/components/TeePreview";
import { CLASS_LABELS, STATUS_CODES, statusClass, formatMoney, BASE_PRICE_CENTS, type StatusClass } from "@/lib/catalog";

const FEATURED = [418, 404, 200, 503];

export default function Home() {
  const classes = [1, 2, 3, 4, 5] as StatusClass[];
  return (
    <div className="mx-auto max-w-6xl px-5">
      <section className="py-16 sm:py-24 grid gap-10 lg:grid-cols-[1.2fr_1fr] items-center">
        <div>
          <p className="font-mono text-accent text-sm mb-4">HTTP/1.1 200 OK · Content-Type: cotton/100</p>
          <h1 className="font-mono font-extrabold text-4xl sm:text-6xl leading-[1.02] tracking-tight">
            Shirts for people<br />who think in status codes.
          </h1>
          <p className="text-muted text-lg mt-6 max-w-xl">
            Every HTTP response you have ever loved, hated, or debugged at 3am, printed big on a heavyweight cotton tee.
            Pick the code that describes you today. Printed on demand, shipped worldwide.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/tee/418" className="rounded-lg bg-accent text-ink font-mono font-extrabold px-5 py-3 hover:brightness-110">
              418 I&apos;m a teapot →
            </Link>
            <Link href="#codes" className="rounded-lg border border-white/20 font-mono px-5 py-3 hover:border-white/50">
              Browse all {STATUS_CODES.length} codes
            </Link>
          </div>
          <p className="font-mono text-xs text-muted mt-6">From {formatMoney(BASE_PRICE_CENTS)} · 3 print designs · 10 shirt colours · XS–5XL</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {FEATURED.map((c, i) => {
            const s = STATUS_CODES.find((x) => x.code === c)!;
            return (
              <Link key={c} href={`/tee/${c}`} className="rounded-xl bg-white/[0.03] border border-white/10 p-2 hover:border-accent/60 transition">
                <TeePreview status={s} style={i % 2 ? "response" : "big"} colorId={["black", "white", "navy blue", "sand"][i]} className="w-full h-auto" />
              </Link>
            );
          })}
        </div>
      </section>

      <section id="codes" className="py-10">
        {classes.map((cls) => {
          const codes = STATUS_CODES.filter((s) => statusClass(s.code) === cls);
          return (
            <div key={cls} className="mb-14">
              <h2 className="font-mono font-extrabold text-2xl mb-1">{CLASS_LABELS[cls]}</h2>
              <p className="text-muted text-sm mb-6">{codes.length} codes</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {codes.map((s) => (
                  <Link key={s.code} href={`/tee/${s.code}`} className="group rounded-xl border border-white/10 bg-white/[0.02] p-3 hover:border-accent/60 transition">
                    <TeePreview status={s} style="big" colorId="black" className="w-full h-auto" />
                    <div className="mt-2 font-mono">
                      <div className="font-extrabold">{s.code}</div>
                      <div className="text-xs text-muted truncate">{s.phrase}{s.unofficial ? " *" : ""}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
        <p className="font-mono text-xs text-muted">* unofficial, but real enough that someone shipped it.</p>
      </section>

      <section id="faq" className="py-10 max-w-3xl">
        <h2 className="font-mono font-extrabold text-2xl mb-6">FAQ</h2>
        <dl className="grid gap-6 text-sm">
          <div>
            <dt className="font-mono font-extrabold">What am I actually getting?</dt>
            <dd className="text-muted mt-1">A Gildan Softstyle 64000 unisex tee (100% ring-spun cotton, crew neck), direct-to-garment printed on the front by Prodigi&apos;s print network, in the lab closest to you.</dd>
          </div>
          <div>
            <dt className="font-mono font-extrabold">Is the print exactly what I see in the preview?</dt>
            <dd className="text-muted mt-1">Yes. The preview and the 300dpi print file are generated from the same code, so the layout is identical. Ink is white on dark shirts and black on light shirts.</dd>
          </div>
          <div>
            <dt className="font-mono font-extrabold">How long does it take?</dt>
            <dd className="text-muted mt-1">Printing takes 2–4 business days, then standard shipping. Most orders land within 5–12 business days. You get a tracking link on your order page.</dd>
          </div>
          <div>
            <dt className="font-mono font-extrabold">My favourite code is missing.</dt>
            <dd className="text-muted mt-1">That is a 501 for now. Email us and we will consider it, especially if it is a good joke.</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
