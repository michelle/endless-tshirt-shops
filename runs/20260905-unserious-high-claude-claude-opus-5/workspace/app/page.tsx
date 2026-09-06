import StoreClient from '@/components/StoreClient';
import { PRINT_DPI } from '@/lib/print-layout';
import { PRODIGI_SKU } from '@/lib/catalog';

export const dynamic = 'force-dynamic';

const TICKER = [
  '1,000 new designs every second',
  'never restocked',
  'sold out the instant you buy it',
  'no two customers share a moment',
  'the past is non-refundable',
  'printed on demand, obviously',
  'accurate to the millisecond',
  'the shirt does not update',
];

const PILLARS = [
  {
    num: '01',
    title: 'The moment is minted at checkout',
    body:
      'The clock on this page is a preview. The real timestamp is stamped by our server the instant your payment starts, so nobody can buy a moment that has not happened yet, and nobody can buy one twice.',
  },
  {
    num: '02',
    title: 'Genuinely a limited edition',
    body:
      `The print file is generated fresh from your millisecond at ${PRINT_DPI} DPI and handed to the printer as a URL. We are not being cute about scarcity. There is exactly one of these.`,
  },
  {
    num: '03',
    title: 'It is a real, good t-shirt',
    body:
      'Direct-to-garment printed on a Gildan 64000 softstyle tee, 100% cotton, then shipped from whichever of Prodigi\u2019s print labs is nearest to you.',
  },
];

const FAQ = [
  {
    q: 'Which datetime, exactly?',
    a: 'Unix time in milliseconds — the number of milliseconds since 1 January 1970, UTC. Thirteen digits. It is the most honest possible way to write down a moment, and the least useful way to read one.',
  },
  {
    q: 'Can I choose my own timestamp?',
    a: 'No. That would make it a novelty item. This is a documentary garment.',
  },
  {
    q: 'What if I want the moment I put the shirt on instead?',
    a: 'Then you would need a shirt that updates, which is a screen, which is a different and much more expensive product. Buy a second shirt.',
  },
  {
    q: 'Will my shirt be out of date?',
    a: 'Immediately. That is the entire premise. It was out of date before the payment cleared.',
  },
  {
    q: 'What if two people click buy at the same millisecond?',
    a: 'Then two people own the same moment and we will simply never tell either of them. Statistically you are fine.',
  },
  {
    q: 'Returns?',
    a: 'We accept returns of the shirt. We cannot accept returns of the moment; it has already been used.',
  },
  {
    q: 'Is this a real store?',
    a: 'The checkout is real Stripe and the fulfilment is a real Prodigi print order. Whether a store that sells one thousand indistinguishable products per second is "real" in the deeper sense is left to the customer.',
  },
];

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ cancelled?: string }>;
}) {
  const { cancelled } = await searchParams;

  return (
    <>
      <header className="wrap masthead">
        <p className="wordmark">
          datetime<span className="dot">.</span>store
        </p>
        <p className="masthead-note">est. a moment ago</p>
      </header>

      <main>
        <section className="wrap hero">
          <span className="eyebrow">
            <span className="blink" aria-hidden="true" />
            in stock for the next 1ms
          </span>
          <h1>
            we sell a t&#8209;shirt with
            <br />
            the current datetime<span className="dot">.</span>
          </h1>
          <p>
            That is the whole store. The number on the shirt is the exact millisecond you bought
            it, printed once, on cotton, and then never again.
          </p>
        </section>

        <div className="wrap">
          <StoreClient cancelled={cancelled === '1'} />
        </div>

        <div className="ticker" aria-hidden="true">
          <div className="ticker-track">
            {[...TICKER, ...TICKER].map((item, i) => (
              <span key={i}>{item}</span>
            ))}
          </div>
        </div>

        <section className="wrap section">
          <h2>How it works</h2>
          <p className="section-lede">
            There is not much to it, which is why we have written three paragraphs about it.
          </p>
          <div className="grid-3">
            {PILLARS.map((p) => (
              <article className="card" key={p.num}>
                <span className="num">{p.num}</span>
                <h3>{p.title}</h3>
                <p>{p.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="wrap section" style={{ paddingTop: 0 }}>
          <h2>Questions we have decided you have</h2>
          <p className="section-lede">Nobody has asked us any of these.</p>
          <div className="faq">
            {FAQ.map((item) => (
              <details key={item.q}>
                <summary>{item.q}</summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="wrap footer-row">
          <div>
            <strong style={{ color: 'var(--muted)' }}>datetime.store</strong>
            <br />
            A shirt that was accurate once.
          </div>
          <div style={{ textAlign: 'right' }}>
            Payments by Stripe · Printing by Prodigi
            <br />
            <code>SKU {PRODIGI_SKU}</code>
          </div>
        </div>
      </footer>
    </>
  );
}
