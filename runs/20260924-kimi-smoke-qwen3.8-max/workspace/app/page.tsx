import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { GALLERY_PRESETS, PRESETS } from '@/lib/presets';
import { encodeDesign, PALETTES, GARMENT_COLORS, sizeLabel } from '@/lib/design';
import { formatCents, SHIRT_UNIT_CENTS } from '@/lib/pricing';

export const dynamic = 'force-dynamic';

function renderUrl(design: (typeof PRESETS)[number]['design'], w = 700) {
  return `/api/render?d=${encodeURIComponent(encodeDesign(design))}&w=${w}`;
}

function panelBg(forGarment: 'dark' | 'light') {
  return forGarment === 'dark' ? '#23201b' : '#efe9db';
}

export default function LandingPage() {
  const hero = PRESETS[0]; // Matterhorn, bone palette

  return (
    <>
      <Header />

      {/* ---------- hero ---------- */}
      <section className="container hero">
        <div>
          <span className="eyebrow">Personalised topographic tees · made to order</span>
          <h1>
            Wear the shape of <em>your place.</em>
          </h1>
          <p className="hero-sub">
            Pick any spot on Earth — where you were born, where you said yes, the summit you
            earned — and we draw its real contours into a one-of-one cartographic portrait,
            printed directly onto the garment. No white box. No inventory. Just your ground.
          </p>
          <div className="hero-ctas">
            <Link href="/design" className="btn btn-accent">
              Design yours — {formatCents(SHIRT_UNIT_CENTS)}
            </Link>
            <a href="#how" className="btn btn-ghost">
              See how it works
            </a>
          </div>
          <p className="hero-note">
            Generated from real elevation data · Bella+Canvas 3001 · ships worldwide
          </p>
        </div>
        <div>
          <div className="tee-panel" style={{ background: '#17171a' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={renderUrl(hero.design, 830)}
              alt={`Topographic portrait of ${hero.design.label}`}
              width={830}
              height={1169}
            />
          </div>
          <p className="tee-caption">
            “{hero.design.label}” · Bone ink on Black · 10 km across
          </p>
        </div>
      </section>

      {/* ---------- how it works ---------- */}
      <section className="section" id="how">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">How it works</span>
            <h2>From coordinates to cotton in three moves</h2>
            <p>
              Every shirt is generated the moment you design it and printed the moment you pay —
              direct-to-garment ink sinks into the fibres, so the terrain feels like part of the
              tee, not a sticker on it.
            </p>
          </div>
          <div className="three-col">
            <div className="feature">
              <span className="step-no">01 · CHOOSE</span>
              <h3>Find your place</h3>
              <p>
                Search any location on Earth, or drop a pin on the exact coordinates. Zoom from a
                single neighbourhood out to a whole massif.
              </p>
            </div>
            <div className="feature">
              <span className="step-no">02 · MAKE IT YOURS</span>
              <h3>Name it, date it, ink it</h3>
              <p>
                Add the place name, a line that means something, and the date. Pick an ink
                palette and a garment colour — the preview is the actual print file.
              </p>
            </div>
            <div className="feature">
              <span className="step-no">03 · WE PRINT & SHIP</span>
              <h3>One of one, on demand</h3>
              <p>
                Payment triggers the print lab directly. Your artwork is rendered at 300 DPI,
                DTG-printed on a Bella+Canvas 3001, and shipped to your door.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- gallery ---------- */}
      <section className="section" id="gallery">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">The gallery</span>
            <h2>Six places, six portraits</h2>
            <p>
              Every design below was generated from real terrain — pick one as a starting point,
              then make it yours.
            </p>
          </div>
          <div className="gallery-grid">
            {GALLERY_PRESETS.map((p) => {
              const pal = PALETTES[p.design.palette];
              return (
                <Link
                  key={p.design.label}
                  href={`/design?d=${encodeURIComponent(encodeDesign(p.design))}`}
                  className="gallery-card"
                >
                  <div style={{ background: panelBg(pal.forGarment) }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      className="art"
                      src={renderUrl(p.design, 400)}
                      alt={`Topographic portrait of ${p.design.label}`}
                      loading="lazy"
                      width={400}
                      height={563}
                    />
                  </div>
                  <div className="meta">
                    <h3>{p.design.label}</h3>
                    <div className="story">{p.story}</div>
                    <div className="cta-line">
                      {pal.name} ink · {p.design.radiusKm} km — start from here →
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ---------- the tee ---------- */}
      <section className="section" id="tee">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">The garment</span>
            <h2>Bella+Canvas 3001 — the tee other tees get measured against</h2>
          </div>
          <div className="product-split">
            <div>
              <div className="spec-list">
                <div className="row">
                  <span className="k">Fabric</span>
                  <span>100% Airlume combed &amp; ring-spun cotton, 140 g/m²</span>
                </div>
                <div className="row">
                  <span className="k">Fit</span>
                  <span>Unisex retail fit, crew neck, side-seamed</span>
                </div>
                <div className="row">
                  <span className="k">Print</span>
                  <span>Direct-to-garment, water-based ink, transparent background — the design breathes with the fabric</span>
                </div>
                <div className="row">
                  <span className="k">Sizes</span>
                  <span>{['xs', 's', 'm', 'l', 'xl', '2xl', '3xl', '4xl'].map((s) => sizeLabel(s)).join(' · ')}</span>
                </div>
                <div className="row">
                  <span className="k">Price</span>
                  <span>{formatCents(SHIRT_UNIT_CENTS)} + flat shipping (US $6 · international $14)</span>
                </div>
                <div className="row">
                  <span className="k">Care</span>
                  <span>Wash cold, inside out. Tumble low. The ink outlasts the trends.</span>
                </div>
              </div>
              <div style={{ marginTop: 28, display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                <div>
                  <div className="eyebrow" style={{ marginBottom: 10 }}>Garment colours</div>
                  <div className="color-row">
                    {GARMENT_COLORS.map((c) => (
                      <span
                        key={c.id}
                        title={c.name}
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: '50%',
                          background: c.hex,
                          display: 'inline-block',
                          boxShadow: 'inset 0 0 0 1.5px rgba(0,0,0,.25)',
                        }}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <div className="eyebrow" style={{ marginBottom: 10 }}>Ink palettes</div>
                  <div className="palette-row">
                    {Object.values(PALETTES).map((p) => (
                      <span key={p.id} title={`${p.name} — for ${p.forGarment} garments`} style={{ textAlign: 'center' }}>
                        <span
                          style={{
                            width: 30,
                            height: 30,
                            borderRadius: '50%',
                            background: p.swatchCss,
                            display: 'inline-block',
                            boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.15)',
                          }}
                        />
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div>
              <div className="tee-panel" style={{ background: '#efe9db' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={renderUrl(PRESETS[1].design, 830)}
                  alt="Topographic portrait of the Grand Canyon"
                  loading="lazy"
                  width={830}
                  height={1169}
                />
              </div>
              <p className="tee-caption">“Grand Canyon” · Clay ink on Cream · 25 km across</p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- faq ---------- */}
      <section className="section faq" id="faq">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">Questions</span>
            <h2>Before you order</h2>
          </div>
          <details>
            <summary>Is the map real?</summary>
            <p>
              Yes — every contour is generated from open elevation datasets (SRTM, USGS, ETOPO
              bathymetry) via the AWS Terrain Tiles archive. The marker sits exactly on the
              coordinates you choose, and the printed file is the same 2490×3510 render you
              preview, at 300 DPI.
            </p>
          </details>
          <details>
            <summary>Why does the print have no background?</summary>
            <p>
              That is direct-to-garment printing at its best: we print only the ink, with a
              transparent background, so the shirt colour becomes the map&rsquo;s canvas. No
              rubbery white rectangle — the fabric stays soft and the design moves with you.
            </p>
          </details>
          <details>
            <summary>How long does it take?</summary>
            <p>
              Made to order: production typically takes 2–5 business days at our print network,
              then standard shipping runs ~5–10 business days domestically and 7–15
              internationally.
            </p>
          </details>
          <details>
            <summary>Can I return it?</summary>
            <p>
              Because every shirt is generated just for you, personalised items are final sale —
              unless something arrives misprinted or damaged, in which case we reprint or refund
              it, no arguments.
            </p>
          </details>
          <details>
            <summary>What if my place is flat?</summary>
            <p>
              Flat ground makes for serene, wide-spaced contours — honestly, some of our
              favourite shirts. Widen the radius slider to take in more relief, or embrace the
              minimalism. (Oceans count too: below sea level we draw the seafloor and ink the
              water.)
            </p>
          </details>
          <details>
            <summary>Can I order the same design twice?</summary>
            <p>
              Yes — your design lives in the URL, so bookmark it or share it. Same coordinates,
              same radius, same words: the exact same print, every time.
            </p>
          </details>
        </div>
      </section>

      {/* ---------- closing cta ---------- */}
      <section className="section" style={{ textAlign: 'center', paddingTop: 76, paddingBottom: 86 }}>
        <div className="container">
          <span className="eyebrow">One shirt. One place. One of one.</span>
          <h2 style={{ fontSize: 'clamp(32px, 4vw, 48px)', margin: '14px 0 26px' }}>
            Everybody has a place. Now it has a shirt.
          </h2>
          <Link href="/design" className="btn btn-accent">
            Start your portrait
          </Link>
        </div>
      </section>

      <Footer />
    </>
  );
}
