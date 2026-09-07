'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import {
  ArrowRight,
  Check,
  Minus,
  Plus,
  Radio,
  ShoppingBag,
  Sparkles,
  Trash2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

const products = [
  {
    id: 'night-signal',
    name: 'Night Signal',
    price: 34,
    image: '/products/night-signal.png',
    color: 'Black',
    issue: 'Transmission 001',
    note: 'Small front hit · bone + acid ink',
  },
  {
    id: 'lunar-static',
    name: 'Lunar Static',
    price: 38,
    image: '/products/lunar-static.png',
    color: 'Cream',
    issue: 'Transmission 002',
    note: 'Oversized front print · cobalt + signal red',
  },
  {
    id: 'dead-air-club',
    name: 'Dead Air Club',
    price: 36,
    image: '/products/dead-air-club.png',
    color: 'Burnt orange',
    issue: 'Transmission 003',
    note: 'Field recorder print · ink + warm cream',
  },
] as const;

const sizes = ['S', 'M', 'L', 'XL', '2XL'] as const;

type CartItem = {
  productId: (typeof products)[number]['id'];
  size: (typeof sizes)[number];
  quantity: number;
};

type CheckoutResult = {
  orderId?: string;
  reference?: string;
  error?: string;
};

export default function Home() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<Record<string, string>>({
    'night-signal': 'M',
    'lunar-static': 'M',
    'dead-air-club': 'M',
  });
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [checkoutResult, setCheckoutResult] = useState<CheckoutResult | null>(null);

  const itemCount = cart.reduce((total, item) => total + item.quantity, 0);
  const subtotal = useMemo(
    () =>
      cart.reduce((total, item) => {
        const product = products.find((entry) => entry.id === item.productId);
        return total + (product?.price ?? 0) * item.quantity;
      }, 0),
    [cart],
  );

  useEffect(() => {
    const modelContext = (
      document as Document & {
        modelContext?: {
          registerTool: (
            tool: {
              name: string;
              title: string;
              description: string;
              inputSchema: object;
              annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
              execute: (input: unknown) => unknown;
            },
            options?: { signal?: AbortSignal },
          ) => void | Promise<void>;
        };
      }
    ).modelContext;
    if (!modelContext?.registerTool) return;

    const lifecycle = new AbortController();
    const registration = modelContext.registerTool(
      {
        name: 'add_shirt_to_bag',
        title: 'Add shirt to bag',
        description: 'Add one Afterglow shirt in a selected size to the visible shopping bag.',
        inputSchema: {
          type: 'object',
          properties: {
            productId: { type: 'string', enum: products.map((product) => product.id) },
            size: { type: 'string', enum: sizes },
          },
          required: ['productId', 'size'],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        execute(input) {
          if (!input || typeof input !== 'object') throw new Error('Product and size are required.');
          const { productId, size } = input as { productId?: string; size?: string };
          const product = products.find((entry) => entry.id === productId);
          if (!product || !sizes.includes(size as CartItem['size'])) throw new Error('Choose a valid product and size.');
          setCart((current) => {
            const existingIndex = current.findIndex((item) => item.productId === product.id && item.size === size);
            if (existingIndex < 0) return [...current, { productId: product.id, size: size as CartItem['size'], quantity: 1 }];
            return current.map((item, index) => index === existingIndex ? { ...item, quantity: item.quantity + 1 } : item);
          });
          setCheckoutResult(null);
          setCheckoutOpen(false);
          setCartOpen(true);
          return { added: product.name, size, quantity: 1 };
        },
      },
      { signal: lifecycle.signal },
    );
    Promise.resolve(registration).catch(() => undefined);
    return () => lifecycle.abort();
  }, []);

  function addToCart(productId: CartItem['productId']) {
    const size = selectedSizes[productId] as CartItem['size'];
    setCart((current) => {
      const existing = current.find(
        (item) => item.productId === productId && item.size === size,
      );
      if (existing) {
        return current.map((item) =>
          item === existing ? { ...item, quantity: item.quantity + 1 } : item,
        );
      }
      return [...current, { productId, size, quantity: 1 }];
    });
    setCheckoutResult(null);
    setCheckoutOpen(false);
    setCartOpen(true);
  }

  function updateQuantity(index: number, change: number) {
    setCart((current) =>
      current
        .map((item, itemIndex) =>
          itemIndex === index
            ? { ...item, quantity: item.quantity + change }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  }

  async function submitCheckout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setCheckoutResult(null);
    const form = new FormData(event.currentTarget);
    const recipient = Object.fromEntries(form.entries());

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cart, recipient }),
      });
      const result = (await response.json()) as CheckoutResult;
      if (!response.ok) throw new Error(result.error || 'Could not place order');
      setCheckoutResult(result);
      setCart([]);
    } catch (error) {
      setCheckoutResult({
        error: error instanceof Error ? error.message : 'Could not place order',
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <div className="signal-bar">
        <span>US shipping available</span>
        <span className="hidden sm:inline">·</span>
        <span className="hidden sm:inline">Made to order · No dead stock</span>
      </div>

      <header className="site-header">
        <a href="#top" className="brand" aria-label="Afterglow Supply home">
          <span className="brand-mark"><Radio aria-hidden="true" /></span>
          <span>AFTERGLOW<small>SUPPLY CO.</small></span>
        </a>
        <nav className="hidden items-center gap-8 md:flex" aria-label="Main navigation">
          <a href="#collection">Collection</a>
          <a href="#story">Our signal</a>
        </nav>
        <Button
          variant="outline"
          size="lg"
          className="cart-button"
          onClick={() => setCartOpen(true)}
          aria-label={`Open cart with ${itemCount} items`}
        >
          <ShoppingBag aria-hidden="true" />
          Bag <span className="cart-count">{itemCount}</span>
        </Button>
      </header>

      <section id="top" className="hero">
        <div className="hero-copy">
          <p className="eyebrow"><span /> After-hours issue 01</p>
          <h1>Wear the<br /><em>quiet hours.</em></h1>
          <p className="hero-intro">
            Ring-spun tees for night owls, dial turners, and anyone still
            listening after the city goes quiet.
          </p>
          <div className="hero-actions">
            <a className="primary-link" href="#collection">
              Shop the transmissions <ArrowRight aria-hidden="true" />
            </a>
            <span>3 original designs · First release</span>
          </div>
        </div>

        <div className="hero-product">
          <div className="orbit-label orbit-one">88.1 FM</div>
          <div className="orbit-label orbit-two">SIGNAL FOUND</div>
          <Image
            src="/products/night-signal.png"
            alt="Black Night Signal t-shirt with a radio tower graphic"
            width={1254}
            height={1254}
            priority
          />
          <div className="hero-product-card">
            <div>
              <span>Transmission 001</span>
              <strong>Night Signal Tee</strong>
            </div>
            <span>$34</span>
          </div>
        </div>
      </section>

      <section id="collection" className="collection">
        <div className="section-heading">
          <div>
            <p className="eyebrow"><span /> First transmission</p>
            <h2>Three signals.<br />No filler.</h2>
          </div>
          <p>
            Original graphics on soft, substantial Bella + Canvas 3001 tees.
            Printed one at a time with water-based inks.
          </p>
        </div>

        <div className="product-grid">
          {products.map((product, index) => (
            <article className={`product-card product-${index + 1}`} key={product.id}>
              <div className="product-image-wrap">
                <span className="issue-tag">{product.issue}</span>
                <Image
                  src={product.image}
                  alt={`${product.color} ${product.name} t-shirt`}
                  width={1254}
                  height={1254}
                />
                <button
                  className="quick-add"
                  onClick={() => addToCart(product.id)}
                  aria-label={`Add ${product.name} in size ${selectedSizes[product.id]} to bag`}
                >
                  <Plus aria-hidden="true" />
                </button>
              </div>
              <div className="product-info">
                <div>
                  <h3>{product.name}</h3>
                  <p>{product.note}</p>
                </div>
                <strong>${product.price}</strong>
              </div>
              <div className="product-controls">
                <Select
                  value={selectedSizes[product.id]}
                  onValueChange={(value) =>
                    value && setSelectedSizes((current) => ({ ...current, [product.id]: value }))
                  }
                >
                  <SelectTrigger className="size-select" aria-label={`Size for ${product.name}`}>
                    Size <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {sizes.map((size) => <SelectItem key={size} value={size}>{size}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button className="add-button" size="lg" onClick={() => addToCart(product.id)}>
                  Add to bag <ArrowRight aria-hidden="true" />
                </Button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="story" className="story-section">
        <div className="story-number">01—03</div>
        <div>
          <p className="eyebrow"><span /> Why Afterglow</p>
          <h2>Clothes for people<br />who notice the static.</h2>
        </div>
        <div className="story-copy">
          <Sparkles aria-hidden="true" />
          <p>
            Afterglow began as a stack of late-night sketches: lunar weather,
            wandering frequencies, and field recordings from places that only
            exist after midnight. Every shirt starts with an original drawing
            and is made only when somebody wants one.
          </p>
          <div className="quality-list">
            <span><Check /> Ring-spun cotton</span>
            <span><Check /> Water-based inks</span>
            <span><Check /> White-label shipping</span>
          </div>
        </div>
      </section>

      <footer>
        <div className="brand footer-brand">
          <span className="brand-mark"><Radio aria-hidden="true" /></span>
          <span>AFTERGLOW<small>SUPPLY CO.</small></span>
        </div>
        <p>Broadcasting from somewhere after midnight.</p>
        <p>© {new Date().getFullYear()} Afterglow Supply Co.</p>
      </footer>

      <Sheet open={cartOpen} onOpenChange={setCartOpen}>
        <SheetContent className="cart-sheet" aria-describedby="cart-description">
          <SheetHeader className="cart-header">
            <SheetDescription id="cart-description">Your selected transmissions</SheetDescription>
            <SheetTitle>Your bag <span>{itemCount}</span></SheetTitle>
          </SheetHeader>

          {checkoutResult?.orderId ? (
            <div className="success-state">
              <span className="success-icon"><Check /></span>
              <p className="eyebrow">Signal received</p>
              <h2>Sandbox order placed.</h2>
              <p>
                Your test order <strong>{checkoutResult.orderId}</strong> was
                accepted by Prodigi. Nothing will be printed or charged.
              </p>
              <Button size="lg" onClick={() => setCartOpen(false)}>Back to the collection</Button>
            </div>
          ) : checkoutOpen ? (
            <form className="checkout-form" onSubmit={submitCheckout}>
              <button type="button" className="back-button" onClick={() => setCheckoutOpen(false)}>
                ← Back to bag
              </button>
              <div className="sandbox-note"><Radio /> Sandbox checkout · no payment or fulfillment</div>
              <h2>Where should this test order go?</h2>
              <div className="field-grid">
                <label className="field-full" htmlFor="checkout-name">Full name<Input id="checkout-name" name="name" autoComplete="name" required placeholder="Jamie Rivera" /></label>
                <label className="field-full" htmlFor="checkout-email">Email<Input id="checkout-email" name="email" type="email" autoComplete="email" required placeholder="jamie@example.com" /></label>
                <label className="field-full" htmlFor="checkout-address">Address<Input id="checkout-address" name="line1" autoComplete="address-line1" required placeholder="123 Radio Way" /></label>
                <label htmlFor="checkout-city">City<Input id="checkout-city" name="townOrCity" autoComplete="address-level2" required placeholder="Portland" /></label>
                <label htmlFor="checkout-state">State<Input id="checkout-state" name="stateOrCounty" autoComplete="address-level1" required placeholder="OR" maxLength={2} /></label>
                <label htmlFor="checkout-zip">ZIP code<Input id="checkout-zip" name="postalOrZipCode" autoComplete="postal-code" required placeholder="97205" /></label>
                <label htmlFor="checkout-country">Country<Input id="checkout-country" name="countryCode" value="US" readOnly /></label>
              </div>
              {checkoutResult?.error && <p className="checkout-error" role="alert">{checkoutResult.error}</p>}
              <Button type="submit" size="lg" className="checkout-button" disabled={submitting}>
                {submitting ? 'Sending to Prodigi…' : `Place sandbox order · $${subtotal}`}
              </Button>
              <p className="fine-print">This test creates a real record in the Prodigi sandbox. It does not charge a card or ship a shirt.</p>
            </form>
          ) : cart.length === 0 ? (
            <div className="empty-cart">
              <ShoppingBag />
              <h2>Your bag is quiet.</h2>
              <p>Pick a transmission and it’ll show up here.</p>
              <Button size="lg" onClick={() => setCartOpen(false)}>Browse the collection</Button>
            </div>
          ) : (
            <div className="cart-body">
              <div className="cart-items">
                {cart.map((item, index) => {
                  const product = products.find((entry) => entry.id === item.productId)!;
                  return (
                    <div className="cart-item" key={`${item.productId}-${item.size}`}>
                      <Image src={product.image} alt="" width={184} height={184} />
                      <div className="cart-item-copy">
                        <strong>{product.name}</strong>
                        <span>{product.color} · Size {item.size}</span>
                        <div className="quantity-controls" aria-label={`Quantity for ${product.name}`}>
                          <button onClick={() => updateQuantity(index, -1)} aria-label="Decrease quantity"><Minus /></button>
                          <span>{item.quantity}</span>
                          <button onClick={() => updateQuantity(index, 1)} aria-label="Increase quantity"><Plus /></button>
                        </div>
                      </div>
                      <div className="cart-item-price">
                        <strong>${product.price * item.quantity}</strong>
                        <button onClick={() => setCart((current) => current.filter((_, i) => i !== index))} aria-label={`Remove ${product.name}`}><Trash2 /></button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="cart-summary">
                <div><span>Subtotal</span><strong>${subtotal}</strong></div>
                <div><span>Shipping</span><span>Calculated by Prodigi</span></div>
                <Button size="lg" className="checkout-button" onClick={() => setCheckoutOpen(true)}>
                  Continue to test checkout <ArrowRight />
                </Button>
                <p>No payment collected · Sandbox fulfillment only</p>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </main>
  );
}
