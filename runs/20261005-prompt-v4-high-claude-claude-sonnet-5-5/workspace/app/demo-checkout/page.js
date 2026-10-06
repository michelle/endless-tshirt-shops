import DemoCheckoutForm from '@/components/DemoCheckoutForm';
import { Footer, Nav } from '@/components/SiteChrome';
import { config } from '@/lib/config.js';
import { COUNTRY_NAMES, SHIPPING, SHIRTS, decodeDesign, priceCents } from '@/lib/design.js';
import { verify } from '@/lib/sign.js';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Test checkout — Skyprint' };

const money = (c) => `$${(c / 100).toFixed(2)}`;

export default async function DemoCheckout({ searchParams }) {
  const sp = await searchParams;
  const payload = config.demoPayments ? verify(String(sp.token || '')) : null;
  const v = payload?.t === 'demo-checkout' ? decodeDesign(payload.design) : { ok: false };
  if (!v.ok) {
    return (<><Nav /><main className="page"><h1>Checkout expired</h1><p>This test checkout link is no longer valid.</p><a className="btn" href="/#design">Back to designer</a></main><Footer /></>);
  }
  const d = v.design;
  const price = priceCents(d.size);
  const ship = SHIPPING[payload.country];
  const q = new URLSearchParams({ ...d, lines: d.lines ? '1' : '0', planets: d.planets ? '1' : '0', w: '500' }).toString();
  return (
    <>
      <Nav />
      <main className="page" style={{ maxWidth: 980 }}>
        <div className="demo-banner"><strong>Test mode.</strong> This store has no live payment processor connected yet. No money is taken and no shirt is shipped.</div>
        <h1 style={{ fontSize: 44 }}>Checkout</h1>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,320px)', gap: 30, marginTop: 20 }}>
          <div className="card"><DemoCheckoutForm token={String(sp.token)} /></div>
          <div className="card" style={{ alignSelf: 'start' }}>
            <div style={{ background: SHIRTS[d.shirt].hex, borderRadius: 10, padding: 10 }}><img src={`/api/preview?${q}`} alt="Your design" style={{ width: '100%', display: 'block' }} /></div>
            <h3 style={{ fontSize: 24, margin: '14px 0 4px' }}>{d.title || d.place}</h3>
            <p className="note" style={{ margin: 0 }}>{d.shirt.replace('-', ' ')} tee · size {d.size.toUpperCase()} · {d.date}</p>
            <div className="sumline" style={{ marginTop: 12 }}><span>Tee</span><span>{money(price)}</span></div>
            <div className="sumline"><span>Shipping ({COUNTRY_NAMES[payload.country]})</span><span>{money(ship)}</span></div>
            <div className="sumline total"><span>Total</span><span>{money(price + ship)}</span></div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
