'use client';

import { useMemo, useState } from 'react';

const products = [
  { id: 'midnight', name: 'The Long Way Home', color: 'black', colorName: 'Midnight black', price: 38, note: 'The flagship tee: a whole universe between the last exit and home.' },
  { id: 'navy', name: 'The Long Way Home', color: 'navy blue', colorName: 'Late-night navy', price: 38, note: 'Same late-shift story, softened into a deep celestial blue.' },
  { id: 'natural', name: 'The Long Way Home', color: 'natural', colorName: 'Roadside natural', price: 38, note: 'A warm, vintage-paper ground for the night-drive colorway.' }
];

function Shirt({ color = 'black', small = false }) {
  return <div className={`shirt ${small ? 'small' : ''}`} style={{ '--shirt': color }}><div className="shirt-neck" /><img src="/art/night-shift-atlas.png" alt="Night Shift Atlas artwork: a cosmic gas station" /></div>;
}

export default function Store() {
  const [cart, setCart] = useState([]);
  const [selected, setSelected] = useState(products[0]);
  const [size, setSize] = useState('m');
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState({ name: '', email: '', line1: '', city: '', region: '', postalCode: '', countryCode: 'US' });
  const quantity = cart.reduce((sum, item) => sum + item.quantity, 0);
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const addToCart = () => {
    const existing = cart.find(item => item.id === selected.id && item.size === size);
    setCart(existing ? cart.map(item => item === existing ? { ...item, quantity: item.quantity + 1 } : item) : [...cart, { ...selected, size, quantity: 1 }]);
    setNotice(`${selected.colorName}, ${size.toUpperCase()} added to your orbit.`);
  };
  const submit = async (event) => {
    event.preventDefault();
    setLoading(true); setNotice('Sending your order to the sandbox print lab…');
    try {
      const response = await fetch('/api/order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ customer: form, cart }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not place order.');
      setNotice(`Sandbox order ${data.orderId || 'created'} is in ${data.status || data.outcome}. No payment or physical shipment was created.`);
      setCart([]); setCheckoutOpen(false);
    } catch (error) { setNotice(error.message); }
    finally { setLoading(false); }
  };
  const cartLabel = useMemo(() => quantity ? `${quantity} ${quantity === 1 ? 'signal' : 'signals'}` : 'Cart', [quantity]);

  return <main>
    <div className="announcement">Free US shipping on orders over $75 <span>•</span> Printed when you order. No midnight waste.</div>
    <nav><a className="brand" href="#top"><i>✦</i> NIGHT SHIFT ATLAS</a><div className="navlinks"><a href="#collection">Shop</a><a href="#story">Our signal</a><button onClick={() => setCheckoutOpen(true)} aria-label="Open cart">{cartLabel} <b>{quantity}</b></button></div></nav>
    <section className="hero" id="top"><div className="hero-copy"><p className="eyebrow">FOR THE QUIETLY CURIOUS</p><h1>Wear the <em>long way</em> home.</h1><p className="lede">Shirts for gas-station coffee, wrong turns, and looking up when everyone else looks down.</p><a className="button" href="#collection">Find your route <span>↗</span></a><p className="micro">Small batch art · DTG printed to order · White-label delivery</p></div><div className="hero-art"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><Shirt color="black" /><span className="sticker sticker-top">NO RUSH<br />NO MAP</span><span className="sticker sticker-bottom">EST. 02:17 AM</span></div></section>
    <section className="marquee"><span>STAY CURIOUS</span><span>✦</span><span>KEEP DRIVING</span><span>✦</span><span>LOOK UP</span><span>✦</span><span>STAY CURIOUS</span></section>
    <section className="collection" id="collection"><div className="section-heading"><p className="eyebrow">FIRST DROP · 001</p><h2>One map. Three skies.</h2><p>A good shirt starts a conversation. This one might start a detour.</p></div><div className="product-grid">{products.map(product => <article className={`product ${selected.id === product.id ? 'selected' : ''}`} key={product.id} onClick={() => setSelected(product)}><div className="product-image"><Shirt color={product.color} /><span>+ view route</span></div><div className="product-info"><div><h3>{product.colorName}</h3><p>{product.name}</p></div><strong>${product.price}</strong></div></article>)}</div></section>
    <section className="detail"><div className="detail-shirt"><Shirt color={selected.color} /><div className="star s1">✦</div><div className="star s2">✦</div></div><div className="detail-copy"><p className="eyebrow">SELECTED ROUTE</p><h2>{selected.name}</h2><p>{selected.note}</p><div className="choices"><label>Color <div className="swatches">{products.map(product => <button key={product.id} className={selected.id === product.id ? 'active' : ''} onClick={() => setSelected(product)}><i style={{ background: product.color === 'natural' ? '#ddd1b5' : product.color }} />{product.colorName}</button>)}</div></label><label>Size <select value={size} onChange={e => setSize(e.target.value)}>{['xs', 's', 'm', 'l', 'xl', '2xl', '3xl', '4xl'].map(value => <option key={value}>{value.toUpperCase()}</option>)}</select></label></div><button className="button add" onClick={addToCart}>Add to cart — ${selected.price} <span>+</span></button><p className="fine">Bella + Canvas 3001 · soft 100% Airlume combed cotton · printed to order · unisex fit</p></div></section>
    <section className="story" id="story"><p className="eyebrow">THE NIGHT SHIFT MANIFESTO</p><h2>For people who take<br />the scenic route after dark.</h2><p>Night Shift Atlas is an imaginary roadside atlas for real people: late workers, early travelers, dreamers who make one more turn just to see what’s there. We put that feeling on the softest shirts we could find.</p><div className="values"><span>01 <b>Made to order</b>Less inventory. More intention.</span><span>02 <b>Global print labs</b>Made closer to your door.</span><span>03 <b>Original art</b>No borrowed nostalgia.</span></div></section>
    <footer><a className="brand" href="#top"><i>✦</i> NIGHT SHIFT ATLAS</a><p>Follow the signal. © 2026</p><a href="mailto:hello@nightshiftatlas.com">hello@nightshiftatlas.com</a></footer>
    {notice && <div className="toast" role="status">{notice}<button onClick={() => setNotice('')}>×</button></div>}
    {checkoutOpen && <div className="modal-backdrop" onMouseDown={() => !loading && setCheckoutOpen(false)}><section className="checkout" onMouseDown={e => e.stopPropagation()}><button className="close" onClick={() => setCheckoutOpen(false)}>×</button><p className="eyebrow">CHECKOUT · SANDBOX</p><h2>Send a signal.</h2>{cart.length ? <><div className="cart-items">{cart.map((item, index) => <div key={`${item.id}-${item.size}`}><Shirt color={item.color} small /><p><b>{item.colorName}</b><br />{item.size.toUpperCase()} · {item.quantity} × ${item.price}</p><button onClick={() => setCart(cart.filter((_, i) => i !== index))}>Remove</button></div>)}</div><p className="checkout-total">Merchandise <b>${total}.00</b></p><form onSubmit={submit}><div className="form-grid"><input required placeholder="Full name" value={form.name} onChange={e => setForm({...form, name:e.target.value})}/><input required type="email" placeholder="Email" value={form.email} onChange={e => setForm({...form, email:e.target.value})}/><input required className="wide" placeholder="Street address" value={form.line1} onChange={e => setForm({...form, line1:e.target.value})}/><input required placeholder="City" value={form.city} onChange={e => setForm({...form, city:e.target.value})}/><input placeholder="State / region" value={form.region} onChange={e => setForm({...form, region:e.target.value})}/><input required placeholder="Postal code" value={form.postalCode} onChange={e => setForm({...form, postalCode:e.target.value})}/><input required maxLength="2" placeholder="Country code (US)" value={form.countryCode} onChange={e => setForm({...form, countryCode:e.target.value.toUpperCase()})}/></div><button className="button pay" disabled={loading}>{loading ? 'Contacting print lab…' : 'Create sandbox print order'} <span>↗</span></button><p className="fine">This deployment is connected to Prodigi’s sandbox. No payment is collected and no shirt is physically produced.</p></form></> : <div className="empty"><p>Your cart is quiet.</p><button className="button" onClick={() => setCheckoutOpen(false)}>Browse routes</button></div>}</section></div>}
  </main>;
}
