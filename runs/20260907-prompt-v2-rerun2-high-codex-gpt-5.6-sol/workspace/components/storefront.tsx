'use client';

import Image from 'next/image';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ArrowRight, Check, Minus, Plus, ShoppingBag, Sparkles, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { PRODUCTS, SIZES, type Product, type ProductId } from '@/lib/catalog';

type CartItem = { productId: ProductId; size: string; quantity: number };
type OrderResult = { orderId: string; outcome: string };

export function Storefront() {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedSize, setSelectedSize] = useState<string>('m');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkout, setCheckout] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<OrderResult | null>(null);

  useEffect(() => {
    try { setCart(JSON.parse(localStorage.getItem('elsewhere-cart') || '[]')); } catch { /* ignore corrupt local cart */ }
  }, []);

  useEffect(() => { localStorage.setItem('elsewhere-cart', JSON.stringify(cart)); }, [cart]);

  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = useMemo(() => cart.reduce((sum, item) => {
    const product = PRODUCTS.find((candidate) => candidate.id === item.productId);
    return sum + (product?.price || 0) * item.quantity;
  }, 0), [cart]);

  function addToCart(productId: ProductId, size = selectedSize, quantity = 1) {
    setCart((current) => {
      const match = current.find((item) => item.productId === productId && item.size === size);
      return match
        ? current.map((item) => item === match ? { ...item, quantity: Math.min(8, item.quantity + quantity) } : item)
        : [...current, { productId, size, quantity }];
    });
    setSelectedProduct(null);
    setCartOpen(true);
  }

  function changeQuantity(index: number, delta: number) {
    setCart((current) => current.flatMap((item, itemIndex) => {
      if (itemIndex !== index) return [item];
      const quantity = item.quantity + delta;
      return quantity > 0 ? [{ ...item, quantity: Math.min(8, quantity) }] : [];
    }));
  }

  useEffect(() => {
    const context = (document as Document & { modelContext?: { registerTool: (tool: unknown, options?: { signal?: AbortSignal }) => void | Promise<void> } }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    void Promise.resolve(context.registerTool({
      name: 'add_tee_to_cart', title: 'Add a tee to cart',
      description: 'Add an Elsewhere Supply Co. t-shirt in a chosen size and quantity to the visible shopping cart.',
      inputSchema: {
        type: 'object',
        properties: {
          productId: { type: 'string', enum: PRODUCTS.map((product) => product.id) },
          size: { type: 'string', enum: [...SIZES] },
          quantity: { type: 'integer', minimum: 1, maximum: 8 },
        },
        required: ['productId', 'size'], additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input: unknown) {
        const value = input as { productId?: ProductId; size?: string; quantity?: number };
        if (!PRODUCTS.some((product) => product.id === value.productId) || !SIZES.includes(value.size as typeof SIZES[number])) throw new Error('Invalid product or size');
        const quantity = value.quantity ?? 1;
        if (!Number.isInteger(quantity) || quantity < 1 || quantity > 8) throw new Error('Quantity must be between 1 and 8');
        addToCart(value.productId!, value.size!, quantity);
        return { added: true, productId: value.productId, size: value.size, quantity };
      },
    }, { signal: lifecycle.signal })).catch(() => undefined);
    return () => lifecycle.abort();
  }, []);

  async function submitOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true); setError('');
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/orders', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cart,
          recipient: {
            name: form.get('name'), email: form.get('email'), line1: form.get('line1'), line2: form.get('line2'),
            city: form.get('city'), state: form.get('state'), postalCode: form.get('postalCode'), countryCode: form.get('countryCode'),
          },
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'The sandbox order could not be created.');
      setResult({ orderId: data.orderId, outcome: data.outcome });
      setCart([]);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Something went wrong.'); }
    finally { setSubmitting(false); }
  }

  return (
    <main>
      <div className="announcement"><Sparkles aria-hidden="true" size={15} />Free US shipping on two or more field notes</div>
      <nav className="nav" aria-label="Primary navigation">
        <a className="brand" href="#top" aria-label="Elsewhere Supply Co. home"><span className="brand-mark">E</span><span>ELSEWHERE<br />SUPPLY CO.</span></a>
        <a className="shop-link" href="#collection">Shop the collection</a>
        <button className="cart-button" type="button" aria-label={`Open bag with ${count} items`} onClick={() => setCartOpen(true)}><ShoppingBag size={19} aria-hidden="true" />Bag <span>{count}</span></button>
      </nav>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow">Drop 001 · The Impossible Atlas</p>
          <h1>Proof you<br />went <em>somewhere.</em></h1>
          <p className="lede">Wearable souvenirs from places that don’t exist—printed on heavyweight organic cotton.</p>
          <a className="cta" href="#collection">Explore the drop <ArrowRight size={18} /></a>
          <div className="micro-proof"><span>100% organic cotton</span><span>Printed to order</span><span>Worldwide delivery</span></div>
        </div>
        <div className="hero-image-wrap">
          <Image className="hero-image" src="/product/collection.png" alt="The Moon Orchard, Cloud Library, and Night Swimming graphic t-shirts" fill priority sizes="(max-width: 900px) 100vw, 58vw" />
          <div className="edition-stamp"><span>01</span>FIRST<br />EDITION</div>
        </div>
      </section>

      <section className="collection" id="collection">
        <div className="section-heading">
          <div><p className="eyebrow">The first coordinates</p><h2>Choose your Elsewhere</h2></div>
          <p>Three places. One small first edition. Each design is printed only when you order it.</p>
        </div>
        <div className="product-grid">
          {PRODUCTS.map((product, index) => (
            <article className="product-card" key={product.name}>
              <button className="product-image-frame" type="button" onClick={() => { setSelectedProduct(product); setSelectedSize('m'); }} aria-label={`View ${product.name}`}>
                <Image src="/product/collection.png" alt={`${product.name} graphic t-shirt in ${product.color}`} fill sizes="(max-width: 720px) 100vw, 33vw" style={{ objectPosition: product.position }} />
                <span className="card-index">0{index + 1}</span>
              </button>
              <div className="product-info"><div><p>{product.note}</p><h3>{product.name}</h3><span>{product.color} · XS—3XL</span></div><strong>{product.displayPrice}</strong></div>
              <button className="choose-button" type="button" onClick={() => { setSelectedProduct(product); setSelectedSize('m'); }}>Choose yours <ArrowRight size={17} /></button>
            </article>
          ))}
        </div>
      </section>

      <section className="manifesto">
        <p className="eyebrow">Made nearby, wherever possible</p>
        <h2>Better basics.<br /><span>Stranger stories.</span></h2>
        <div className="manifesto-points">
          <p><b>180gsm organic cotton</b><br />Soft, structured, and made to outlast the trip.</p>
          <p><b>Water-based inks</b><br />Rich color with a softer hand and less waste.</p>
          <p><b>Made after you order</b><br />No overstock. No mystery warehouse mountain.</p>
        </div>
      </section>

      <footer><div className="brand"><span className="brand-mark">E</span><span>ELSEWHERE<br />SUPPLY CO.</span></div><p>Small-run souvenirs for imaginary destinations.</p><span>© 2026</span></footer>

      <Dialog open={!!selectedProduct} onOpenChange={(open) => { if (!open) setSelectedProduct(null); }}>
        <DialogContent className="product-dialog">
          {selectedProduct && <>
            <div className="dialog-art" style={{ background: selectedProduct.id === 'cloud-library' ? '#efe7d2' : '#111a2c' }}>
              <Image src={selectedProduct.art} alt={`${selectedProduct.name} print artwork`} fill sizes="440px" />
            </div>
            <div className="dialog-details">
              <DialogHeader><p className="eyebrow">{selectedProduct.note}</p><DialogTitle>{selectedProduct.name}</DialogTitle><DialogDescription>{selectedProduct.description}</DialogDescription></DialogHeader>
              <div className="size-row"><Label>Size</Label><Select value={selectedSize} onValueChange={(value) => setSelectedSize(value || 'm')}><SelectTrigger className="size-select"><SelectValue /></SelectTrigger><SelectContent>{SIZES.map((size) => <SelectItem value={size} key={size}>{size.toUpperCase()}</SelectItem>)}</SelectContent></Select></div>
              <Button className="add-button" onClick={() => addToCart(selectedProduct.id)}>Add to bag · {selectedProduct.displayPrice}</Button>
              <p className="fit-note">Unisex medium fit. If you prefer a relaxed fit, size up.</p>
            </div>
          </>}
        </DialogContent>
      </Dialog>

      <Sheet open={cartOpen} onOpenChange={setCartOpen}>
        <SheetContent className="cart-sheet">
          <SheetHeader><SheetTitle>Your field bag</SheetTitle><SheetDescription>{count ? `${count} item${count === 1 ? '' : 's'} ready for departure.` : 'It’s light in here—for now.'}</SheetDescription></SheetHeader>
          {result ? <div className="order-success"><span><Check size={30} /></span><h3>Order mapped.</h3><p>Your sandbox order <b>{result.orderId}</b> was accepted by Prodigi. Nothing will be printed or charged.</p><Button onClick={() => { setResult(null); setCheckout(false); setCartOpen(false); }}>Back to Elsewhere</Button></div> : !checkout ? <>
            <div className="cart-items">
              {cart.map((item, index) => {
                const product = PRODUCTS.find((candidate) => candidate.id === item.productId)!;
                return <div className="cart-item" key={`${item.productId}-${item.size}`}>
                  <div className="cart-thumb" style={{ background: product.id === 'cloud-library' ? '#efe7d2' : '#111a2c' }}><Image src={product.art} alt="" fill sizes="84px" /></div>
                  <div className="cart-item-copy"><b>{product.name}</b><span>{product.color} · {item.size.toUpperCase()}</span><div className="quantity"><button type="button" onClick={() => changeQuantity(index, -1)} aria-label={`Remove one ${product.name}`}><Minus /></button><span>{item.quantity}</span><button type="button" onClick={() => changeQuantity(index, 1)} aria-label={`Add one ${product.name}`}><Plus /></button></div></div>
                  <div className="cart-item-price"><b>${product.price * item.quantity}</b><button type="button" onClick={() => setCart((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Remove ${product.name}`}><Trash2 /></button></div>
                </div>;
              })}
              {!cart.length && <div className="empty-cart"><span>Ø</span><p>No coordinates selected yet.</p><button type="button" onClick={() => setCartOpen(false)}>Browse the drop</button></div>}
            </div>
            {!!cart.length && <div className="cart-summary"><div><span>Subtotal</span><b>${subtotal}.00</b></div><p>Shipping is calculated by Prodigi. This demo creates a no-charge sandbox order.</p><Button className="checkout-button" onClick={() => setCheckout(true)}>Continue to sandbox checkout <ArrowRight /></Button></div>}
          </> : <form className="checkout-form" onSubmit={submitOrder}>
            <div className="checkout-heading"><button type="button" onClick={() => setCheckout(false)}>← Back to bag</button><h3>Where should it go?</h3><p>Use a real-looking test address. The sandbox won’t ship or charge.</p></div>
            <Field label="Full name" name="name" autoComplete="name" placeholder="Alex Voyager" required />
            <Field label="Email" name="email" type="email" autoComplete="email" placeholder="alex@example.com" required />
            <Field label="Address" name="line1" autoComplete="address-line1" placeholder="123 Atlas Avenue" required />
            <Field label="Apt, suite, etc. (optional)" name="line2" autoComplete="address-line2" />
            <div className="form-grid"><Field label="City" name="city" autoComplete="address-level2" placeholder="Portland" required /><Field label="State / region" name="state" autoComplete="address-level1" placeholder="OR" required /></div>
            <div className="form-grid"><Field label="Postal code" name="postalCode" autoComplete="postal-code" placeholder="97205" required /><div className="field"><Label htmlFor="countryCode">Country</Label><select id="countryCode" name="countryCode" defaultValue="US" required><option value="US">United States</option><option value="CA">Canada</option><option value="GB">United Kingdom</option><option value="AU">Australia</option><option value="DE">Germany</option><option value="FR">France</option></select></div></div>
            {error && <p className="checkout-error" role="alert">{error}</p>}
            <Button className="checkout-button" disabled={submitting}>{submitting ? 'Mapping your order…' : `Place sandbox order · $${subtotal}.00`}</Button>
          </form>}
        </SheetContent>
      </Sheet>
    </main>
  );
}

function Field({ label, name, ...props }: { label: string; name: string } & React.ComponentProps<'input'>) {
  return <div className="field"><Label htmlFor={name}>{label}</Label><Input id={name} name={name} {...props} /></div>;
}
