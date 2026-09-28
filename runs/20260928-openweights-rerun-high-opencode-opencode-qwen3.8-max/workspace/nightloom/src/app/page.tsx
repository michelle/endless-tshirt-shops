import Studio from '@/components/Studio';

export default function Home() {
  return (
    <div className="mx-auto max-w-7xl px-5 md:px-8">
      {/* ---------- hero ---------- */}
      <section className="pt-16 md:pt-24 pb-12 md:pb-16 text-center">
        <div className="badge mx-auto mb-7">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--gold)]" />
          direct-to-garment · one of one
        </div>
        <h1 className="font-display text-[34px] sm:text-[52px] md:text-[64px] leading-[1.08] tracking-[0.06em] uppercase">
          Wear the night
          <br />
          <span className="gold">you were born</span>
        </h1>
        <p className="mt-7 max-w-2xl mx-auto text-[14.5px] md:text-[15px] muted leading-[1.9]">
          Give us a name, a date and a place. We chart the real sky from that moment —
          every star the eye could see, exactly where it hung — and print it onto a
          Bella+Canvas tee, made just for you. No two shirts alike, because no two
          nights are.
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
          <a href="#studio" className="nl-btn nl-btn-primary">Design yours — $34</a>
          <a href="#how" className="nl-btn nl-btn-ghost">How it works</a>
        </div>
        <div className="mt-6 text-[11.5px] faint tracked">
          2,000+ real catalog stars · precessed to your exact date · ships worldwide
        </div>
      </section>

      {/* ---------- studio ---------- */}
      <Studio />

      {/* ---------- how it works ---------- */}
      <section id="how" className="scroll-mt-20 mt-28">
        <div className="text-center mb-12">
          <div className="divider-star max-w-md mx-auto text-[11px] tracked">how it works</div>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              n: '01',
              t: 'Pick your night',
              d: 'A birth, a first kiss, the night the team finally won — any name, any date, any place on Earth. Toggle constellation lines and star names to taste.',
            },
            {
              n: '02',
              t: 'We chart the real sky',
              d: 'Your sky is computed from the HYG astronomical catalog — ~2,000 stars visible to the eye, coloured by their true spectra, positions precessed to your exact date and hour. Not a stock illustration: your shirt is generated the moment you design it.',
            },
            {
              n: '03',
              t: 'Printed just for you',
              d: 'The moment payment clears, your one-of-one print file goes straight to the print studio — DTG ink lays down every gradient and every faint star on a Bella+Canvas 3001, then it ships to your door.',
            },
          ].map((s) => (
            <div key={s.n} className="panel p-7">
              <div className="gold font-display text-[22px] tracking-[0.2em]">{s.n}</div>
              <div className="mt-4 font-display text-[16px] tracking-[0.14em] uppercase">{s.t}</div>
              <p className="mt-3 text-[13px] muted leading-[1.85]">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- why DTG ---------- */}
      <section id="tee" className="scroll-mt-20 mt-28">
        <div className="panel p-8 md:p-12 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <div className="divider-star text-[11px] tracked mb-6">the tee &amp; the ink</div>
            <h2 className="font-display text-[24px] md:text-[30px] leading-snug tracking-[0.05em] uppercase">
              A sky needs <span className="gold">every colour at once</span>
            </h2>
            <p className="mt-5 text-[13.5px] muted leading-[1.9]">
              Screen printing can&apos;t do a night sky: it needs flat colours, one screen per
              ink, and a minimum run. Direct-to-garment prints like a photograph — thousands
              of stars in their true spectral colours, soft gradients, hairline constellation
              figures — straight onto the fabric, one shirt at a time. That&apos;s why every
              Nightloom can be a true one-of-one: your sky, your name, your night, with no
              setup cost and no inventory.
            </p>
            <ul className="mt-7 space-y-2.5 text-[13px] muted">
              {[
                'Bella+Canvas 3001 · 100% combed & ring-spun cotton, 4.2 oz',
                'Unisex fit · XS–4XL · 9 garment colours',
                'Front print area 12″ × 15″ at 390 dpi',
                'Printed & shipped by Prodigi from the lab nearest you (US · UK · EU)',
              ].map((li) => (
                <li key={li} className="flex gap-3">
                  <span className="gold mt-0.5">✦</span>
                  {li}
                </li>
              ))}
            </ul>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { c: '#141414', p: 'midnight' },
              { c: '#f6f5f1', p: 'ivory' },
              { c: '#5c2433', p: 'twilight' },
              { c: '#1d2a44', p: 'aurora' },
              { c: '#3d4436', p: 'midnight' },
              { c: '#efe6d3', p: 'ivory' },
            ].map((x, i) => (
              <div
                key={i}
                className="aspect-square rounded-xl border hairline flex items-center justify-center"
                style={{ background: x.c }}
              >
                <span
                  className="text-[10px] tracked px-2 py-1 rounded-full border"
                  style={{
                    color: x.p === 'ivory' ? '#101A38' : '#F3EEE3',
                    borderColor: x.p === 'ivory' ? 'rgba(16,26,56,.3)' : 'rgba(243,238,227,.25)',
                  }}
                >
                  {x.p}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- fa ---------- */}
      <section id="faq" className="scroll-mt-20 mt-28 max-w-3xl mx-auto">
        <div className="divider-star text-[11px] tracked mb-6">questions</div>
        {[
          {
            q: 'How accurate is my sky?',
            a: 'Very. We compute star positions from the HYG catalog (the standard astronomical database of ~120,000 stars), keep the ~2,000 brightest — essentially everything the unaided eye can see — and precess their coordinates from the J2000 epoch to your exact date, so the sky drifts correctly across decades. Constellation figures follow the IAU western sky culture.',
          },
          {
            q: 'What time does the sky use?',
            a: 'The time you enter, read as local time at the coordinates you chose (we use local mean solar time at that longitude, so no timezone guessing). Most people pick the actual hour of the event; 21:00–23:00 gives the classic "night" sky if you don\'t know it.',
          },
          {
            q: 'Is it really one of one?',
            a: 'Yes — your print file is generated from your inputs at order time. Nobody else can have your shirt unless they have your exact name, night, place and palette. We never reprint your design for anyone else.',
          },
          {
            q: 'How long does it take?',
            a: 'Your order goes to the print studio the moment payment succeeds. Production typically takes 2–4 business days, then it ships from the lab nearest the recipient (US, UK or EU) — most orders arrive within a week.',
          },
          {
            q: 'Where do you ship?',
            a: '119 countries via Prodigi\'s global print network. Shipping is a flat $6.99.',
          },
          {
            q: 'Can I return it?',
            a: 'Because every shirt is made to order just for you, Nightloom tees are final sale — but if anything arrives damaged or misprinted, contact us and we\'ll reprint it free.',
          },
        ].map((f) => (
          <details key={f.q} className="faq border-b hairline">
            <summary>{f.q}</summary>
            <div className="faq-body">{f.a}</div>
          </details>
        ))}
      </section>

      {/* ---------- final cta ---------- */}
      <section className="mt-28 text-center">
        <h2 className="font-display text-[26px] md:text-[34px] tracking-[0.08em] uppercase leading-snug">
          Somewhere, a sky is <span className="gold">waiting for your name</span>
        </h2>
        <a href="#studio" className="nl-btn nl-btn-primary mt-8">Design yours — $34</a>
      </section>
    </div>
  );
}
