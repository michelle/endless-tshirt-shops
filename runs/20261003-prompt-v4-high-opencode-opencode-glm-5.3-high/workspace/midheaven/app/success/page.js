import Link from 'next/link'
import { headers } from 'next/headers'
import { Header, Footer, Spark } from '@/components/Chrome'
import SkyChart from '@/components/SkyChart'
import { getStripe } from '@/lib/stripe'
import { originFromHeaders, fulfillSession } from '@/lib/fulfill'
import { validateSpec, COLORS, SIZES, titleFor, dateLine, PRICE_CENTS } from '@/lib/spec'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Your order — Midheaven',
}

function StageBadge({ stage }) {
  return (
    <span className="status-badge">
      <span className="pulse" />
      PRODUCING — {String(stage || 'IN PROGRESS').toUpperCase()}
    </span>
  )
}

export default async function SuccessPage({ searchParams }) {
  const sp = await searchParams
  const sid = sp && typeof sp.session_id === 'string' ? sp.session_id : null

  let paid = false
  let fulfilled = false
  let orderId = null
  let stage = null
  let spec = null
  let amount = null
  let email = null
  let shipping = null
  let trouble = null

  if (sid) {
    try {
      const h = await headers()
      const origin = originFromHeaders(h)
      const result = await fulfillSession(sid, origin)
      paid = Boolean(result.paid)
      fulfilled = Boolean(result.fulfilled)
      orderId = result.orderId || null
      stage = result.stage || null
      trouble = result.error || null

      // The session carries everything we need to show a full summary.
      const session = await getStripe().checkout.sessions.retrieve(sid)
      spec = validateSpec(JSON.parse(session.metadata?.spec || 'null'))
      amount = session.amount_total
      email = session.customer_details?.email
      shipping = session.shipping_details || null
    } catch (e) {
      console.error('success page error', e)
      trouble = 'We could not reach the print network just now — your payment is safe.'
    }
  }

  const color = COLORS.find((c) => c.id === spec?.c)
  const size = SIZES.find((s) => s.id === spec?.s)

  return (
    <>
      <Header />
      <main className="success wrap" style={{ padding: '88px 28px 120px' }}>
        {!sid ? (
          <>
            <h1>Nothing to see here.</h1>
            <p className="sub">This page confirms Midheaven orders — start one on the customiser.</p>
            <Link href="/create" className="btn">Create your sky</Link>
          </>
        ) : !paid ? (
          <>
            <div className="mark">◐</div>
            <h1>Payment still settling.</h1>
            <p className="sub">
              Your bank is processing the payment. As soon as it clears we automatically place
              the print order — no action needed. If you paid and nothing happens within a few
              hours, write to us quoting this reference: <code>{sid}</code>
            </p>
          </>
        ) : (
          <>
            <div className="mark">✶</div>
            <h1>The night is yours.</h1>
            <p className="sub">
              Payment received and the print order is placed. Your shirt is computed, printed and
              dispatched from the lab nearest your address — usually within 3–5 working days.
              {email ? ` A receipt and shipping updates go to ${email}.` : ''}
            </p>
            <div className="order-grid">
              <div className="order-art">
                {spec ? <SkyChart spec={spec} /> : null}
              </div>
              <div className="order-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 18, alignItems: 'center', marginBottom: 18 }}>
                  <span className="f-label" style={{ margin: 0 }}>Order summary</span>
                  {fulfilled ? <StageBadge stage={stage} /> : <span className="status-badge">PENDING</span>}
                </div>
                <div className="order-rows">
                  <div><span className="k">Design</span><span className="v">{spec ? titleFor(spec) : '—'}</span></div>
                  <div><span className="k">Night of</span><span className="v">{spec ? dateLine(spec) : '—'}</span></div>
                  <div><span className="k">Place</span><span className="v">{spec ? spec.p : '—'}</span></div>
                  <div><span className="k">Shirt</span><span className="v">{color ? color.label : '—'} · Bella+Canvas 3001 · {size ? size.label.toUpperCase() : '—'}</span></div>
                  {spec && spec.dg ? <div><span className="k">Dedication</span><span className="v" style={{ fontStyle: 'italic' }}>{spec.dg}</span></div> : null}
                  <div><span className="k">Quantity</span><span className="v">{spec ? spec.q : 1}</span></div>
                  <div><span className="k">Paid</span><span className="v">${((amount ?? PRICE_CENTS * (spec?.q || 1)) / 100).toFixed(2)}</span></div>
                  <div><span className="k">Ships to</span><span className="v">{shipping?.name || '—'}</span></div>
                  <div><span className="k">Print order</span><span className="v" style={{ fontFamily: 'var(--mono)', fontSize: 13 }}>{orderId || (fulfilled ? 'placed' : trouble || '—')}</span></div>
                </div>
                <div className="next-steps">
                  <ol>
                    <li>Our engine regenerates your artwork at 300 dpi and sends it to the lab.</li>
                    <li>The lab prints it into the cotton with water-based inks (1–2 days).</li>
                    <li>It ships white-label with a tracking link as soon as it leaves the lab.</li>
                  </ol>
                </div>
              </div>
            </div>
            <div style={{ marginTop: 40, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              <Link href="/create" className="btn btn-ghost">Chart another night</Link>
              <Link href="/" className="btn btn-ghost">Back to the night sky</Link>
            </div>
          </>
        )}
      </main>
      <Footer />
    </>
  )
}
