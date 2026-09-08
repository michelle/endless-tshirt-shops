import Link from "next/link";

export const metadata = { title: "About, sizing & shipping" };

const SIZES = [
  ["XS", "16½", "27"],
  ["S", "18", "28"],
  ["M", "20", "29"],
  ["L", "22", "30"],
  ["XL", "24", "31"],
  ["2XL", "26", "32"],
  ["3XL", "28", "33"],
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 space-y-14">
      <section>
        <p className="stamp mb-4">Memo</p>
        <h1 className="font-slab text-4xl">About the Department</h1>
        <div className="mt-4 space-y-4 text-ink-2">
          <p>
            Every generation gets promised a future. The 1930s were told dinner would be a pill. The 1950s were shown the flying car at
            every World’s Fair. The 1960s booked rooms at lunar hotels. None of it arrived, but somebody would have had to run it.
          </p>
          <p>
            The Department of Obsolete Futures is the umbrella agency for those bureaus: the offices, unions and commissions that would
            have existed if the predictions had come true. Each shirt carries the official seal of one of them. Wear it as a memorial,
            a joke, or a job you’re still waiting to start.
          </p>
          <p>
            Designs are original and printed to order on a Bella+Canvas 3001 unisex tee (100% ring-spun cotton, 4.2 oz) using
            direct-to-garment printing at the Prodigi lab nearest to you.
          </p>
        </div>
      </section>

      <section id="sizing">
        <h2 className="font-slab text-3xl rule pt-4">Sizing</h2>
        <p className="mt-2 text-sm text-ink-2">Unisex retail fit. Measurements in inches, garment laid flat.</p>
        <table className="mt-4 w-full text-sm border-3 border-ink">
          <thead className="bg-ink text-paper uppercase tracking-widest text-xs">
            <tr>
              <th className="p-2 text-left">Size</th>
              <th className="p-2 text-left">Chest width</th>
              <th className="p-2 text-left">Body length</th>
            </tr>
          </thead>
          <tbody>
            {SIZES.map(([s, w, l]) => (
              <tr key={s} className="odd:bg-paper-2">
                <td className="p-2 font-bold">{s}</td>
                <td className="p-2">{w}</td>
                <td className="p-2">{l}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section id="shipping">
        <h2 className="font-slab text-3xl rule pt-4">Shipping &amp; returns</h2>
        <ul className="mt-4 space-y-2 text-sm text-ink-2 list-disc pl-5">
          <li>Standard shipping $5.95 (5–10 business days) or Express $14.95 (2–4 business days), worldwide, tracked.</li>
          <li>Shirts are printed within 2–5 business days of your order, then dispatched.</li>
          <li>Because every shirt is made to order, we can’t accept returns for a change of mind. Misprinted or damaged shirts are replaced free; contact us within 30 days with a photo.</li>
          <li>Track any order at <Link href="/order" className="underline">/order</Link> using the number from your confirmation page.</li>
        </ul>
      </section>
    </div>
  );
}
