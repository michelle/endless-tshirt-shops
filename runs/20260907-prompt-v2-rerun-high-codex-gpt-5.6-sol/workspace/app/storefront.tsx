'use client';
/* oxlint-disable react/react-compiler */

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, Check, Minus, Plus, ShoppingBag, Sparkles, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { COLORS, PRODUCTS, SIZES, type ProductId } from '@/lib/products';

type CartItem = { key: string; productId: ProductId; size: string; color: string; quantity: number };
type CheckoutState = 'idle' | 'submitting' | 'success' | 'error';
type WebMCPContext = { registerTool: (tool: { name: string; title?: string; description: string; inputSchema: object; annotations?: { readOnlyHint?: boolean; untrustedContentHint?: boolean }; execute: (input: unknown) => unknown }, options?: { signal?: AbortSignal }) => void | Promise<void> };

declare global { interface Document { modelContext?: WebMCPContext } }

function money(value: number) { return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value); }

export default function Storefront() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [bagOpen, setBagOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [activeId, setActiveId] = useState<ProductId>('moon-garden');
  const [size, setSize] = useState('m');
  const [color, setColor] = useState('black');
  const [checkoutState, setCheckoutState] = useState<CheckoutState>('idle');
  const [orderId, setOrderId] = useState('');
  const [error, setError] = useState('');
  const [hydrated, setHydrated] = useState(false);
  const activeProduct = PRODUCTS.find((product) => product.id === activeId)!;
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + PRODUCTS.find((product) => product.id === item.productId)!.price * item.quantity, 0);
  const shipping = itemCount >= 2 ? 0 : 5;
  const total = subtotal + shipping;

  useEffect(() => { try { const saved = window.localStorage.getItem('night-shift-cart'); if (saved) setCart(JSON.parse(saved)); } catch {} setHydrated(true); }, []);
  useEffect(() => { if (hydrated) window.localStorage.setItem('night-shift-cart', JSON.stringify(cart)); }, [cart, hydrated]);

  function openPicker(productId: ProductId) {
    const product = PRODUCTS.find((candidate) => candidate.id === productId)!;
    setActiveId(productId); setSize('m'); setColor(product.defaultColor); setPickerOpen(true);
  }

  function addItem(productId = activeId, selectedSize = size, selectedColor = color, quantity = 1) {
    if (!PRODUCTS.some((product) => product.id === productId) || !SIZES.includes(selectedSize as never) || !COLORS.some((item) => item.value === selectedColor) || quantity < 1 || quantity > 10) throw new Error('Choose a valid shirt, size, color, and quantity.');
    const key = `${productId}-${selectedSize}-${selectedColor}`;
    setCart((current) => {
      const match = current.find((item) => item.key === key);
      if (match) return current.map((item) => item.key === key ? { ...item, quantity: Math.min(10, item.quantity + quantity) } : item);
      return [...current, { key, productId, size: selectedSize, color: selectedColor, quantity }];
    });
    setPickerOpen(false); setBagOpen(true);
    return { productId, size: selectedSize, color: selectedColor, quantity };
  }

  function updateQuantity(key: string, change: number) {
    setCart((current) => current.flatMap((item) => item.key !== key ? [item] : item.quantity + change > 0 ? [{ ...item, quantity: Math.min(10, item.quantity + change) }] : []));
  }

  useEffect(() => {
    const context = document.modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    void Promise.resolve(context.registerTool({
      name: 'add_shirt_to_cart', title: 'Add shirt to cart', description: 'Add a Night Shift Field Club shirt in the selected size and color to the visible shopping bag.',
      inputSchema: { type: 'object', properties: { productId: { type: 'string', enum: PRODUCTS.map((product) => product.id) }, size: { type: 'string', enum: [...SIZES] }, color: { type: 'string', enum: COLORS.map((item) => item.value) }, quantity: { type: 'integer', minimum: 1, maximum: 10 } }, required: ['productId', 'size', 'color'], additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input) { const value = input as Partial<CartItem>; return addItem(value.productId as ProductId, value.size ?? '', value.color ?? '', value.quantity ?? 1); },
    }, { signal: lifecycle.signal })).catch(() => undefined);
    return () => lifecycle.abort();
  }, []);

  async function submitOrder(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault(); setCheckoutState('submitting'); setError('');
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ customer: Object.fromEntries(form), items: cart.map(({ productId, size, color, quantity }) => ({ productId, size, color, quantity })) }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'The sandbox order could not be created.');
      setOrderId(result.orderId); setCheckoutState('success'); setCart([]);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'The sandbox order could not be created.'); setCheckoutState('error'); }
  }

  const cartRows = useMemo(() => cart.map((item) => ({ ...item, product: PRODUCTS.find((product) => product.id === item.productId)! })), [cart]);

  return (
    <main>
      <div className="announcement">Free US shipping on 2+ tees · Sandbox shop preview</div>
      <nav className="nav-shell" aria-label="Primary navigation">
        <a className="wordmark" href="#top" aria-label="Night Shift Field Club home">NIGHT SHIFT <span>FIELD CLUB</span></a>
        <div className="nav-links"><a href="#shop">Shop the drop</a><a href="#field-notes">Field notes</a></div>
        <button className="bag-button" type="button" aria-label={`Open shopping bag with ${itemCount} items`} onClick={() => setBagOpen(true)}><ShoppingBag size={18} strokeWidth={1.8} /> Bag <span>{itemCount}</span></button>
      </nav>

      <section className="hero" id="top">
        <div className="hero-copy"><p className="eyebrow"><Sparkles size={15} /> Shirts for after sunset</p><h1>Stay curious.<br /><em>Stay out late.</em></h1><p className="lede">Original field-art tees for people who notice what wakes up when the rest of the world clocks out.</p><a className="primary-link" href="#shop">Explore drop 01 <ArrowDown size={17} /></a></div>
        <div className="hero-art" aria-label="Moon Garden shirt artwork"><span className="orbit orbit-one" /><span className="orbit orbit-two" /><Image src="/designs/luna-moth.png" alt="Luna moth circling a crescent moon among night flowers" width={1024} height={1536} priority /><div className="specimen-label"><span>DROP 01</span><strong>MOON GARDEN</strong><span>NO. 001 / NIGHT OBSERVATIONS</span></div></div>
        <p className="edition-note">Three original studies. Printed on soft, responsibly sourced cotton.</p>
      </section>

      <section className="shop-section" id="shop">
        <header className="section-heading"><div><p className="eyebrow">The first night survey</p><h2>Drop 01</h2></div><p>Three habitats. One rule: keep looking.</p></header>
        <div className="product-grid">{PRODUCTS.map((product, index) => <article className="product-card" key={product.id}><div className={`product-art ${product.tone}`}><span className="card-number">0{index + 1}</span><Image src={product.image} alt={`${product.name} original shirt artwork`} width={1024} height={1536} /><button type="button" className="quick-add" onClick={() => openPicker(product.id)}>Choose yours</button></div><div className="product-meta"><div><p>{product.field}</p><h3>{product.name}</h3></div><strong>{money(product.price)}</strong></div></article>)}</div>
      </section>

      <section className="field-notes" id="field-notes">
        <div><p className="eyebrow">Field kit details</p><h2>Built for the long way home.</h2></div>
        <div className="note-grid"><article><span>01</span><h3>Soft, lived-in cotton</h3><p>Bella + Canvas 3001 unisex crew neck in an easy everyday fit.</p></article><article><span>02</span><h3>Printed on demand</h3><p>Your tee is made only after you order, cutting out unnecessary inventory.</p></article><article><span>03</span><h3>Original night studies</h3><p>Every graphic is created for this collection and unavailable anywhere else.</p></article></div>
      </section>

      <footer><a className="wordmark" href="#top">NIGHT SHIFT <span>FIELD CLUB</span></a><p>For moth people, tidepool people, and anyone still looking up.</p><span>© 2026 · Drop 01</span></footer>

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}><DialogContent className="product-dialog"><div className={`dialog-art ${activeProduct.tone}`}><Image src={activeProduct.image} alt={activeProduct.name} width={640} height={800} /></div><div className="dialog-details"><DialogHeader><p className="mini-label">{activeProduct.field}</p><DialogTitle>{activeProduct.name}</DialogTitle><DialogDescription>{activeProduct.story}</DialogDescription></DialogHeader><div className="choice-row"><span>Size</span><Select value={size} onValueChange={(value) => setSize(value ?? 'm')}><SelectTrigger className="store-select" aria-label="Size"><SelectValue /></SelectTrigger><SelectContent>{SIZES.map((item) => <SelectItem key={item} value={item}>{item.toUpperCase()}</SelectItem>)}</SelectContent></Select></div><div className="choice-row"><span>Shirt color</span><Select value={color} onValueChange={(value) => setColor(value ?? 'black')}><SelectTrigger className="store-select" aria-label="Shirt color"><SelectValue /></SelectTrigger><SelectContent>{COLORS.map((item) => <SelectItem key={item.value} value={item.value}><span className="swatch" style={{ backgroundColor: item.hex }} />{item.label}</SelectItem>)}</SelectContent></Select></div><button className="add-button" type="button" onClick={() => addItem()}>Add to bag · {money(activeProduct.price)}</button><p className="fine-print">Unisex fit · Made to order · Sandbox checkout</p></div></DialogContent></Dialog>

      <Sheet open={bagOpen} onOpenChange={setBagOpen}><SheetContent className="cart-sheet"><SheetHeader><SheetTitle>Your field bag <span>({itemCount})</span></SheetTitle><SheetDescription>Made-to-order tees, prepared one at a time.</SheetDescription></SheetHeader><div className="cart-body">{cartRows.length === 0 ? <div className="empty-cart"><ShoppingBag /><h3>Your bag is still out exploring.</h3><p>Choose a field study to bring home.</p><button onClick={() => setBagOpen(false)}>Browse the drop</button></div> : cartRows.map((item) => <article className="cart-item" key={item.key}><div className={`cart-thumb ${item.product.tone}`}><Image src={item.product.image} alt="" width={120} height={150} /></div><div className="cart-item-copy"><h3>{item.product.name}</h3><p>{item.size.toUpperCase()} · {COLORS.find((entry) => entry.value === item.color)?.label}</p><div className="quantity"><button aria-label="Decrease quantity" onClick={() => updateQuantity(item.key, -1)}><Minus /></button><span>{item.quantity}</span><button aria-label="Increase quantity" onClick={() => updateQuantity(item.key, 1)}><Plus /></button></div></div><div className="cart-price"><strong>{money(item.product.price * item.quantity)}</strong><button aria-label={`Remove ${item.product.name}`} onClick={() => setCart((current) => current.filter((entry) => entry.key !== item.key))}><Trash2 /></button></div></article>)}</div>{cartRows.length > 0 && <div className="cart-summary"><div><span>Subtotal</span><strong>{money(subtotal)}</strong></div><div><span>Shipping</span><strong>{shipping === 0 ? 'Free' : money(shipping)}</strong></div><p>Taxes are not calculated in this sandbox demo.</p><button onClick={() => { setBagOpen(false); setCheckoutOpen(true); setCheckoutState('idle'); }}>Sandbox checkout · {money(total)}</button></div>}</SheetContent></Sheet>

      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}><DialogContent className="checkout-dialog">{checkoutState === 'success' ? <div className="success-state"><div className="success-icon"><Check /></div><p className="mini-label">Sandbox order created</p><DialogTitle>Night mission logged.</DialogTitle><DialogDescription>No payment was taken and nothing will be printed or shipped.</DialogDescription><div className="order-number"><span>Prodigi order</span><strong>{orderId}</strong></div><button onClick={() => setCheckoutOpen(false)}>Return to the shop</button></div> : <><DialogHeader><p className="mini-label">Safe to test · No charge</p><DialogTitle>Where would this order go?</DialogTitle><DialogDescription>This sends a real test order to Prodigi&apos;s sandbox. It will not be produced or billed.</DialogDescription></DialogHeader><form className="checkout-form" onSubmit={submitOrder}><label><span>Email</span><input required type="email" name="email" autoComplete="email" placeholder="night.owl@example.com" /></label><label><span>Full name</span><input required name="name" autoComplete="name" placeholder="Avery Stargazer" /></label><label className="wide"><span>Address</span><input required name="line1" autoComplete="address-line1" placeholder="14 Test Place" /></label><label><span>City</span><input required name="city" autoComplete="address-level2" placeholder="Somewhere" /></label><label><span>State / county</span><input name="state" autoComplete="address-level1" placeholder="CA" /></label><label><span>ZIP / postal code</span><input required name="postalCode" autoComplete="postal-code" placeholder="94107" /></label><div className="form-field"><span>Country</span><Select name="countryCode" defaultValue="US"><SelectTrigger className="checkout-select" aria-label="Country"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="US">United States</SelectItem><SelectItem value="GB">United Kingdom</SelectItem><SelectItem value="CA">Canada</SelectItem><SelectItem value="AU">Australia</SelectItem></SelectContent></Select></div>{error && <p className="checkout-error" role="alert">{error}</p>}<div className="checkout-total"><span>Demo order total</span><strong>{money(total)}</strong></div><button className="place-order" type="submit" disabled={checkoutState === 'submitting'}>{checkoutState === 'submitting' ? 'Sending to Prodigi…' : 'Create sandbox order'}</button></form></>}</DialogContent></Dialog>
    </main>
  );
}
