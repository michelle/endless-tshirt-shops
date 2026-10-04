import { Header, Footer } from '@/components/Chrome'
import Customizer from '@/components/Customizer'
import { SAMPLES } from '@/lib/samples'
import { validateSpec } from '@/lib/spec'

export const metadata = {
  title: 'Create your sky — Midheaven',
  description:
    'Build the exact night sky of your moment: date, time and place, set in ivory on a premium dark cotton tee.',
}

export default async function CreatePage({ searchParams }) {
  const sp = await searchParams
  let initial = null
  if (sp && typeof sp.sample === 'string' && SAMPLES[sp.sample]) {
    const s = SAMPLES[sp.sample].spec
    initial = validateSpec(s) || s
  }
  return (
    <>
      <Header />
      <main>
        <div className="cz-head">
          <div className="wrap">
            <p className="kicker">№ 00 — The customiser</p>
            <h1 className="display" style={{ fontSize: 'clamp(34px, 4.4vw, 56px)' }}>
              Build your night.
            </h1>
            <p className="lede" style={{ marginBottom: 0 }}>
              The preview below is live — every change recomputes the real sky. What you see is
              what gets printed.
            </p>
          </div>
        </div>
        <div className="wrap">
          <Customizer initial={initial} />
        </div>
      </main>
      <Footer />
    </>
  )
}
