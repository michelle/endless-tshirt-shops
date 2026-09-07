import Link from 'next/link';
import { DESIGNS } from '@/lib/catalog';

export const metadata = { title: 'Why these six — Last Shift' };

export default function About() {
  return (
    <div className="wrap" style={{ padding: '56px 0 80px', maxWidth: 760 }}>
      <div className="eyebrow">Notes from the register</div>
      <h1 className="serif" style={{ fontSize: 'clamp(34px,5vw,52px)', margin: '10px 0 22px', lineHeight: 1.06 }}>
        Why these six
      </h1>
      <p style={{ fontSize: 17, color: 'var(--ink-2)' }}>
        A trade earns a crest here if three things are true. It employed enough people to have a
        culture. It ended — not shrank, ended — because of something invented. And the person doing
        it was the last line of defence against something going wrong: the missed shift, the dark
        street, the dropped call, the melted cargo, the bad number, the river.
      </p>
      <p style={{ fontSize: 17, color: 'var(--ink-2)' }}>
        None of the six were replaced by better people. They were replaced by cheaper machines,
        which is a different and much less comfortable thing.
      </p>

      <div style={{ marginTop: 46 }}>
        {DESIGNS.map((d) => (
          <div key={d.slug} style={{ borderTop: '1px solid var(--rule)', padding: '26px 0' }}>
            <div className="eyebrow">{d.local} · {d.years}</div>
            <h3 className="serif" style={{ fontSize: 25, margin: '8px 0 6px' }}>
              <Link href={`/shirt/${d.slug}`}>{d.trade}</Link>
            </h3>
            <p style={{ margin: '0 0 10px', color: 'var(--ink-2)' }}>{d.blurb}</p>
            <p style={{ margin: 0, fontSize: 14, color: 'var(--ink-soft)' }}><em>{d.fact}</em></p>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 40 }}>
        <Link href="/#shirts" className="btn btn-ink">Back to the register</Link>
      </div>
    </div>
  );
}
