'use client';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight,
  ArrowRight,
  Shuffle,
  Sparkles,
  LockKeyhole,
  Minus,
  Plus,
} from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  artwork,
  Design,
  initialDesign,
  palettes,
  PRICE,
  SHIPPING,
  orderSchema,
} from '@/lib/design';
const presets = [
  {
    label: 'A birthday',
    headline: 'THE GOOD YEARS',
    city: 'BROOKLYN, NY',
    tracks: [
      'Late nights & early flights',
      'The people who stayed',
      'Everything still to come',
    ],
  },
  {
    label: 'Your people',
    headline: 'THE USUAL SUSPECTS',
    city: 'AUSTIN, TX',
    tracks: [
      'One more for the road',
      'Same table every Friday',
      'Friends who became family',
    ],
  },
  {
    label: 'A new chapter',
    headline: 'JUST GETTING STARTED',
    city: 'PORTLAND, OR',
    tracks: [
      'A little leap of faith',
      'Keys to a new beginning',
      'The best is still ahead',
    ],
  },
];
export default function Store({
  paymentReady,
  sandbox,
  supportEmail,
}: {
  paymentReady: boolean;
  sandbox: boolean;
  supportEmail: string;
}) {
  const [design, setDesign] = useState<Design>(initialDesign),
    [size, setSize] = useState('m'),
    [quantity, setQuantity] = useState(1),
    [approved, setApproved] = useState(false),
    [view, setView] = useState('shirt'),
    [modal, setModal] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [restored, setRestored] = useState(false),
    [requestId, setRequestId] = useState('');
  const svg = useMemo(() => artwork(design), [design]);
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('ah-design') || 'null');
      if (saved) {
        const parsed = orderSchema.safeParse({ ...saved, approved: true });
        if (parsed.success) {
          setDesign(parsed.data.design);
          setSize(parsed.data.size);
          setQuantity(parsed.data.quantity);
          setRequestId(parsed.data.requestId);
        }
      }
    } catch {}
    setRestored(true);
    if (location.search.includes('canceled'))
      setError(
        'Checkout canceled. Your design is still here; no new payment was completed.',
      );
  }, []);
  useEffect(() => {
    if (restored)
      localStorage.setItem(
        'ah-design',
        JSON.stringify({
          design,
          size,
          quantity,
          requestId: requestId || crypto.randomUUID(),
        }),
      );
  }, [design, size, quantity, requestId, restored]);
  function change(p: Partial<Design>) {
    setDesign((d) => ({ ...d, ...p }));
    setApproved(false);
    setRequestId(crypto.randomUUID());
    setError('');
  }
  async function checkout() {
    setError('');
    const id = requestId || crypto.randomUUID();
    setRequestId(id);
    const parsed = orderSchema.safeParse({
      design,
      size,
      quantity,
      approved,
      requestId: id,
    });
    if (!parsed.success) {
      setError(
        !approved
          ? 'Please approve your design and size before continuing.'
          : parsed.error.issues[0].message,
      );
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(
          data.error || 'Checkout is unavailable. Please try again.',
        );
      location.assign(data.url);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  useEffect(() => {
    const context = (
      document as Document & {
        modelContext?: {
          registerTool: (
            tool: unknown,
            options: { signal: AbortSignal },
          ) => unknown;
        };
      }
    ).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    try {
      void Promise.resolve(
        context.registerTool(
          {
            name: 'personalize_after_hours_shirt',
            title: 'Personalize tour shirt',
            description:
              'Update the headline and place in the shirt preview. Does not order or pay.',
            inputSchema: {
              type: 'object',
              properties: {
                headline: { type: 'string', minLength: 1, maxLength: 24 },
                city: { type: 'string', minLength: 1, maxLength: 28 },
              },
              required: ['headline', 'city'],
              additionalProperties: false,
            },
            annotations: { readOnlyHint: false },
            execute: async (input: unknown) => {
              const value = input as { headline: unknown; city: unknown };
              if (
                typeof value?.headline !== 'string' ||
                typeof value.city !== 'string' ||
                !value.headline.trim() ||
                !value.city.trim() ||
                value.headline.length > 24 ||
                value.city.length > 28
              )
                throw new Error(
                  'Headline and city must be nonempty and within their character limits.',
                );
              change({ headline: value.headline, city: value.city });
              return { status: 'preview_updated', paymentRequired: true };
            },
          },
          { signal: lifecycle.signal },
        ),
      ).catch(() => {});
    } catch {}
    return () => lifecycle.abort();
  }, []);
  return (
    <>
      <div className="announcement">
        {sandbox
          ? 'SANDBOX STUDIO · TEST ORDERS ONLY · NO SHIRTS WILL SHIP'
          : 'MADE FOR YOU. PRINTED TO ORDER. NEVER OFF THE RACK.'}
      </div>
      <header className="nav">
        <a className="brand" href="/">
          AFTER HOURS<span>↗</span>
        </a>
        <nav className="nav-links">
          <a href="#customize">The studio</a>
          <a href="#how-it-works">How it works</a>
          <span className="nav-note">YOUR LIFE. THE TOUR TEE.</span>
        </nav>
      </header>
      <main className="store-main">
        <div className="crumb">THE STUDIO / PERSONAL TOUR TEE / VOL. 001</div>
        <div className="product">
          <section className="visual-column" aria-label="Your shirt preview">
            <div className="product-visual">
              <div className="preview-stage">
                <img
                  className="shirt-img"
                  src="/shirt.webp"
                  alt="Black crewneck t-shirt, front view"
                  width={1254}
                  height={1254}
                />
                {view === 'shirt' ? (
                  <div
                    className="print-overlay"
                    role="img"
                    aria-label={`Personalized artwork for ${design.headline}`}
                    dangerouslySetInnerHTML={{ __html: svg }}
                  />
                ) : (
                  <div
                    className="art-full"
                    role="img"
                    aria-label="Full personalized print artwork"
                    dangerouslySetInnerHTML={{ __html: svg }}
                  />
                )}
                <div className="view-controls">
                  <button
                    className={view === 'shirt' ? 'active' : ''}
                    aria-pressed={view === 'shirt'}
                    onClick={() => setView('shirt')}
                  >
                    On the tee
                  </button>
                  <button
                    className={view === 'art' ? 'active' : ''}
                    aria-pressed={view === 'art'}
                    onClick={() => setView('art')}
                  >
                    The artwork
                  </button>
                </div>
                <span className="preview-tag">BLACK / FULL-COLOR DTG</span>
                <span className="edition">ED. 1 OF 1 ↗</span>
              </div>
              <div className="preview-caption">
                <span className="caption-status">
                  Live preview · made from your story
                </span>
                <span>Placement and color are approximate.</span>
              </div>
              <div className="design-note">
                <Sparkles size={21} />
                <p>
                  <strong>Not a band. Your life.</strong>
                  <br />
                  The inside jokes. The big nights. The next chapter. Give them
                  the tour tee they deserve.
                </p>
              </div>
            </div>
          </section>
          <section className="product-info" id="customize">
            <p className="eyebrow">THE PERSONAL TOUR COLLECTION</p>
            <div className="title-row">
              <h1>
                Your life.
                <br />
                The tour tee.
              </h1>
              <span className="price">$42</span>
            </div>
            <p className="intro">
              A one-night-only lineup of everything that makes you, you. Your
              words. Your colors. A soundwave that belongs to your story.
            </p>
            <div className="spec-pills">
              <span>100% cotton</span>
              <span>Unisex fit</span>
              <span>Made one at a time</span>
            </div>
            <div className="form-section">
              <div className="section-head">
                <h2>
                  <span className="step">01</span> Write your headline
                </h2>
                <button
                  className="text-button"
                  onClick={() => setModal('inspiration')}
                >
                  Need inspiration?
                </button>
              </div>
              <label className="field">
                <span className="field-top">
                  Your headline <small>{design.headline.length}/24</small>
                </span>
                <input
                  maxLength={24}
                  value={design.headline}
                  onChange={(e) => change({ headline: e.target.value })}
                  placeholder="THE GOOD YEARS"
                />
              </label>
              <div className="field-grid">
                <label className="field">
                  <span className="field-top">A place that matters</span>
                  <input
                    maxLength={28}
                    value={design.city}
                    onChange={(e) => change({ city: e.target.value })}
                  />
                </label>
                <label className="field">
                  <span className="field-top">Your date</span>
                  <input
                    type="date"
                    value={design.date}
                    onChange={(e) =>
                      change({ date: e.target.value || initialDesign.date })
                    }
                  />
                </label>
              </div>
              <label className="field">
                <span className="field-top">
                  Your personal setlist <small>Three little memories</small>
                </span>
                {design.tracks.map((t, i) => (
                  <span className="track-input" key={i}>
                    <span>0{i + 1}</span>
                    <input
                      aria-label={`Memory ${i + 1}`}
                      value={t}
                      maxLength={30}
                      onChange={(e) =>
                        change({
                          tracks: design.tracks.map((v, j) =>
                            i === j ? e.target.value : v,
                          ),
                        })
                      }
                    />
                  </span>
                ))}
              </label>
            </div>
            <div className="form-section">
              <div className="section-head">
                <h2>
                  <span className="step">02</span> Set the mood
                </h2>
                <button
                  className="text-button"
                  onClick={() =>
                    change({ seed: Math.floor(Math.random() * 999999) + 1 })
                  }
                  style={{ display: 'flex', gap: 5, alignItems: 'center' }}
                >
                  <Shuffle size={13} /> Remix wave
                </button>
              </div>
              <RadioGroup
                className="palettes"
                value={design.palette}
                onValueChange={(v) =>
                  change({ palette: v as Design['palette'] })
                }
                aria-label="Print color palette"
              >
                {Object.entries(palettes).map(([key, p]) => (
                  <label key={key} className="palette-option">
                    <RadioGroupItem value={key} aria-label={p.name} />
                    <span
                      className="swatch"
                      style={{
                        background: `linear-gradient(135deg,${p.a},${p.b})`,
                      }}
                    />
                    {p.name}
                  </label>
                ))}
              </RadioGroup>
            </div>
            <div className="form-section">
              <div className="section-head">
                <h2>
                  <span className="step">03</span> Find your fit
                </h2>
                <button
                  className="text-button"
                  onClick={() => setModal('sizes')}
                >
                  Size guide ↗
                </button>
              </div>
              <RadioGroup
                className="sizes"
                value={size}
                onValueChange={(v) => {
                  setSize(String(v));
                  setApproved(false);
                  setRequestId(crypto.randomUUID());
                }}
                aria-label="Shirt size"
              >
                {['s', 'm', 'l', 'xl', '2xl', '3xl'].map((s) => (
                  <label className="size-option" key={s}>
                    <RadioGroupItem value={s} aria-label={s.toUpperCase()} />
                    {s.toUpperCase()}
                  </label>
                ))}
              </RadioGroup>
            </div>
            <label className="approval">
              <Checkbox
                checked={approved}
                onCheckedChange={(v) => setApproved(Boolean(v))}
              />
              I’ve checked my spelling, date and size. Print this exact design.
            </label>
            <div className="buy-row">
              <div className="quantity" aria-label="Quantity">
                <button
                  aria-label="Decrease quantity"
                  onClick={() => {
                    setQuantity((q) => Math.max(1, q - 1));
                    setRequestId(crypto.randomUUID());
                  }}
                  disabled={quantity === 1}
                >
                  <Minus size={13} />
                </button>
                <span aria-live="polite">{quantity}</span>
                <button
                  aria-label="Increase quantity"
                  disabled={quantity === 5}
                  onClick={() => {
                    setQuantity((q) => Math.min(5, q + 1));
                    setRequestId(crypto.randomUUID());
                  }}
                >
                  <Plus size={13} />
                </button>
              </div>
              <button className="buy-button" disabled={busy} onClick={checkout}>
                <span>
                  {busy
                    ? 'Opening secure checkout…'
                    : `Make it mine — $${(PRICE * quantity) / 100}`}
                </span>
                <ArrowRight size={19} />
              </button>
            </div>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <p className="shipping-copy">
              <LockKeyhole
                size={12}
                style={{ display: 'inline', verticalAlign: 'middle' }}
              />{' '}
              Secure Stripe checkout · ${SHIPPING / 100} US shipping per order
            </p>
            {!paymentReady && (
              <p className="setup-note">
                The studio is open for designing. Checkout is not yet available
                while the store’s payment account is connected.
              </p>
            )}
            <div className="details-list">
              <details>
                <summary>The shirt & the print</summary>
                <p>
                  Black Bella+Canvas 3001, 100% combed and ring-spun cotton with
                  a soft feel and tailored unisex fit. Your full-color artwork
                  is printed directly onto the front. Every wave is generated
                  from your personal details and remix choice.
                </p>
              </details>
              <details>
                <summary>Shipping & care</summary>
                <p>
                  US delivery only for this first collection. Shipping is $6 per
                  order, including up to five matching shirts. Printing
                  typically takes 3–5 business days; allow another 3–7 business
                  days for delivery. Estimates are not guarantees. Wash inside
                  out on cold, avoid bleach, and tumble dry low.
                </p>
              </details>
              <details>
                <summary>Made for you, from the first letter</summary>
                <p>
                  Please check your preview and size carefully. Each shirt is
                  printed to your specifications. For a damaged, misprinted or
                  incorrect item, keep photos and your order reference, and
                  contact the store through the help details on your order page.
                </p>
              </details>
            </div>
          </section>
        </div>
      </main>
      <section className="story-strip" id="how-it-works">
        <div>
          <span className="eyebrow">ONE OF ONE. ALL YOU.</span>
          <h2>
            Every life deserves
            <br />
            good merch.
          </h2>
        </div>
        <div>
          <span className="eyebrow">01 / MAKE IT PERSONAL</span>
          <h3>Put your story on the bill.</h3>
          <p>
            Start with a birthday, a friendship, a new chapter. Add three
            memories and make the artwork your own.
          </p>
        </div>
        <div>
          <span className="eyebrow">02 / WE TAKE IT FROM HERE</span>
          <h3>From your preview to your doorstep.</h3>
          <p>
            Approve your tee and check out. Once payment is confirmed, your
            design goes to print and ships to you.
          </p>
        </div>
      </section>
      <footer className="footer">
        <span className="brand" style={{ fontSize: 25 }}>
          AFTER HOURS
        </span>
        <span>PERSONAL STORIES. PRINTED LOUD.</span>
        <div className="footer-links">
          <button className="text-button" onClick={() => setModal('privacy')}>
            Privacy
          </button>
          <button className="text-button" onClick={() => setModal('terms')}>
            Store policies
          </button>
          <button className="text-button" onClick={() => setModal('help')}>
            Help
          </button>
        </div>
      </footer>
      <Dialog open={Boolean(modal)} onOpenChange={(o) => !o && setModal('')}>
        <DialogContent style={{ maxWidth: 600, padding: 26 }}>
          <DialogTitle className="sr-only">{modal}</DialogTitle>
          <DialogDescription className="sr-only">
            After Hours studio information
          </DialogDescription>
          <div className="modal-body">
            {modal === 'sizes' ? (
              <>
                <h2>Find your fit.</h2>
                <p>
                  Bella+Canvas 3001 · tailored unisex fit. Manufacturer chest
                  and body-length measurements in inches.
                </p>
                <table>
                  <thead>
                    <tr>
                      <th>Size</th>
                      <th>Chest</th>
                      <th>Length</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['S', '34', '28'],
                      ['M', '38', '29'],
                      ['L', '43', '30'],
                      ['XL', '46', '31'],
                      ['2XL', '50', '32'],
                      ['3XL', '54', '33'],
                    ].map((r) => (
                      <tr key={r[0]}>
                        {r.map((v) => (
                          <td key={v}>{v}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p>
                  <a
                    href="https://www.prodigi.com/products/mens-clothing/t-shirts/classic/bella-canvas-3001/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    View manufacturer sizing details ↗
                  </a>
                </p>
              </>
            ) : modal === 'inspiration' ? (
              <>
                <h2>Start with something real.</h2>
                <p>Choose a starting point, then make every line your own.</p>
                {presets.map((p) => (
                  <button
                    className="buy-button"
                    style={{ margin: '12px 0', background: '#f2f4e8' }}
                    key={p.label}
                    onClick={() => {
                      change({
                        headline: p.headline,
                        city: p.city,
                        tracks: p.tracks,
                      });
                      setModal('');
                    }}
                  >
                    {p.label}
                    <ArrowUpRight size={16} />
                  </button>
                ))}
              </>
            ) : modal === 'privacy' ? (
              <>
                <h2>Your story stays yours.</h2>
                <p>
                  Your design is saved in this browser so you can come back to
                  it. Your payment details are handled by Stripe. For paid
                  orders, your design, selected size and quantity are stored
                  with your order in Stripe; your shipping details and print
                  artwork are sent to Prodigi for fulfillment.
                </p>
                <p>
                  We use no advertising trackers. Print files and order links
                  are private bearer links: keep them to yourself. Payment and
                  shipping providers apply their own retention policies.
                </p>
                <p>
                  To clear your saved design, clear this site’s browser storage.
                  For order-data requests, use the store’s support contact.
                </p>
              </>
            ) : modal === 'terms' ? (
              <>
                <h2>Before the encore.</h2>
                <p>
                  {sandbox
                    ? 'This is a sandbox store. No physical shirts are shipped. Test-mode transactions do not charge real money.'
                    : 'All prices are in US dollars. Shipping is shown before payment; applicable tax is calculated at checkout.'}
                </p>
                <p>
                  Personalized products are made from the text, colors and size
                  you approve. Check them carefully before paying. Production
                  begins after payment confirmation. Cancellation may no longer
                  be possible once production starts.
                </p>
                <p>
                  If an item is damaged, misprinted or incorrect, contact
                  support with photos and your order reference. Changes of mind
                  and sizing mistakes on custom products are reviewed
                  individually. Your applicable consumer rights remain
                  unaffected.
                </p>
                <p>
                  Only submit text you have the right to print. Do not include
                  private information you would not want on a shirt.
                </p>
              </>
            ) : (
              <>
                <h2>Backstage help.</h2>
                {supportEmail ? (
                  <p>
                    Email <a href={`mailto:${supportEmail}`}>{supportEmail}</a>{' '}
                    with your order reference.
                  </p>
                ) : (
                  <p>
                    The store is in setup mode. A customer support address will
                    be published before live sales open.
                  </p>
                )}
                <p>
                  Keep the confirmation link after checkout to check print
                  progress. Never email card numbers or security codes.
                </p>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
