"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/components/CartProvider";
import { COUNTRIES, SHIPPING_METHODS } from "@/lib/shipping";

export default function CheckoutPage() {
  const { items, total, clear, hydrated } = useCart();
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [country, setCountry] = useState("US");
  const [shippingMethod, setShippingMethod] = useState<"Standard" | "Express">(
    "Standard"
  );
  const [card, setCard] = useState("");
  const [exp, setExp] = useState("");
  const [cvc, setCvc] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const shipping = SHIPPING_METHODS.find((m) => m.key === shippingMethod)!;
  const grandTotal = total + shipping.price;

  if (hydrated && items.length === 0 && !submitting) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-24 text-center">
        <h1 className="text-2xl font-black text-white">Your cart is empty</h1>
        <Link
          href="/shop"
          className="mt-6 inline-block rounded-full bg-lime-300 px-6 py-3 font-bold text-black hover:bg-lime-200"
        >
          Browse the collection
        </Link>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          shippingMethod,
          recipient: {
            name,
            email,
            phoneNumber: phone || undefined,
            address: {
              line1,
              line2: line2 || undefined,
              townOrCity: city,
              stateOrCounty: state || undefined,
              postalOrZipCode: zip,
              countryCode: country,
            },
          },
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Checkout failed. Please try again.");
        setSubmitting(false);
        return;
      }

      sessionStorage.setItem(
        "nsc_last_order",
        JSON.stringify({
          ...data,
          items,
          total: grandTotal,
          email,
        })
      );
      clear();
      router.push("/checkout/success");
    } catch {
      setError("Network error placing your order. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-5 py-14">
      <h1 className="text-3xl font-black tracking-tight text-white">
        Checkout
      </h1>

      <div className="mt-8 grid gap-10 sm:grid-cols-[1.4fr_1fr]">
        <form onSubmit={handleSubmit} className="flex flex-col gap-8">
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-1 font-bold text-white">Contact</legend>
            <input
              required
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
            />
            <input
              type="tel"
              placeholder="Phone (recommended for customs)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="input"
            />
          </fieldset>

          <fieldset className="flex flex-col gap-3">
            <legend className="mb-1 font-bold text-white">
              Shipping address
            </legend>
            <input
              required
              placeholder="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
            />
            <input
              required
              placeholder="Address line 1"
              value={line1}
              onChange={(e) => setLine1(e.target.value)}
              className="input"
            />
            <input
              placeholder="Address line 2 (optional)"
              value={line2}
              onChange={(e) => setLine2(e.target.value)}
              className="input"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                required
                placeholder="City"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="input"
              />
              <input
                placeholder="State / county"
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="input"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input
                required
                placeholder="ZIP / postal code"
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                className="input"
              />
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="input"
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </fieldset>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 font-bold text-white">Shipping method</legend>
            {SHIPPING_METHODS.map((m) => (
              <label
                key={m.key}
                className="flex cursor-pointer items-center justify-between rounded-lg border border-white/15 px-4 py-3 has-[:checked]:border-lime-300"
              >
                <span className="flex items-center gap-3 text-sm text-zinc-200">
                  <input
                    type="radio"
                    name="shipping"
                    checked={shippingMethod === m.key}
                    onChange={() => setShippingMethod(m.key)}
                  />
                  {m.label}
                </span>
                <span className="text-sm text-zinc-400">
                  ${m.price.toFixed(2)}
                </span>
              </label>
            ))}
          </fieldset>

          <fieldset className="flex flex-col gap-3">
            <legend className="mb-1 font-bold text-white">Payment</legend>
            <p className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-200">
              Sandbox checkout &mdash; card details are never sent anywhere
              and no real charge is made. Submitting still places a real test
              order with our print partner (Prodigi sandbox) so you can see
              the fulfillment flow end-to-end.
            </p>
            <input
              placeholder="Card number (4242 4242 4242 4242)"
              value={card}
              onChange={(e) => setCard(e.target.value)}
              className="input"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                placeholder="MM/YY"
                value={exp}
                onChange={(e) => setExp(e.target.value)}
                className="input"
              />
              <input
                placeholder="CVC"
                value={cvc}
                onChange={(e) => setCvc(e.target.value)}
                className="input"
              />
            </div>
          </fieldset>

          {error && (
            <p className="rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="rounded-full bg-lime-300 px-6 py-3 font-bold text-black transition hover:bg-lime-200 disabled:opacity-50"
          >
            {submitting ? "Placing order…" : `Place order — $${grandTotal.toFixed(2)}`}
          </button>
        </form>

        <div className="h-fit rounded-xl border border-white/10 bg-white/[0.03] p-5">
          <h2 className="font-bold text-white">Order summary</h2>
          <div className="mt-4 flex flex-col gap-3">
            {items.map((item) => (
              <div key={`${item.slug}-${item.color}-${item.size}`} className="flex justify-between text-sm">
                <span className="text-zinc-300">
                  {item.name} ({item.size.toUpperCase()}) &times; {item.qty}
                </span>
                <span className="text-zinc-400">
                  ${(item.price * item.qty).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-between border-t border-white/10 pt-3 text-sm text-zinc-400">
            <span>Subtotal</span>
            <span>${total.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm text-zinc-400">
            <span>Shipping</span>
            <span>${shipping.price.toFixed(2)}</span>
          </div>
          <div className="mt-2 flex justify-between border-t border-white/10 pt-3 font-bold text-white">
            <span>Total</span>
            <span>${grandTotal.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
