import Link from "next/link";

export default function Cancel() {
  return <main className="status-page"><div className="status-card"><p className="eyebrow">TIME REMAINS FLUID</p><h1>Moment<br /><em>unfrozen.</em></h1><p>No charge was made. The clock kept going, which feels a little pointed.</p><Link className="return" href="/">return to the present →</Link></div></main>;
}
