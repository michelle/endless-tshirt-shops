"use client";

import { useState } from "react";
import Link from "next/link";
import { useCart } from "@/lib/CartContext";
import { getShirtColor, getSize, priceForSize, SHIPPING_FLAT_CENTS } from "@/lib/products";
import { renderDesignDataURL } from "@/lib/renderDesign";
import TshirtMockup from "@/components/TshirtMockup";
import DesignCanvas from "@/components/DesignCanvas";

export default function CartPage() {
  const cart = useCart();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const subtotalCents = cart.items.reduce((sum, i) => sum + priceForSize(i.sizeKey) * i.qty, 0);
  const shippingCents = cart.items.length ? SHIPPING_FLAT_CENTS : 0;

  async function handleCheckout() {
    setError("");
    setLoading(true);
    try {
      const uploaded = [];
      for (const item of cart.items) {
        const color = getShirtColor(item.colorKey);
        const dataUrl = await renderDesignDataURL(
          { phrase: item.phrase, subtitle: item.subtitle, paletteKey: item.paletteKey, shirtIsDark: color.dark },
          { width: 2100 }
        );
        const res = await fetch("/api/upload-design", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dataUrl }),
        });
        if (!res.ok) throw new Error("Failed to prepare artwork for printing.");
        const { url } = await res.json();
        uploaded.push({ ...item, imageUrl: url });
      }

      const checkoutRes = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: uploaded }),
      });
      if (!checkoutRes.ok) {
        const body = await checkoutRes.json().catch(() => ({}));
        throw new Error(body.error || "Could not start checkout.");
      }
      const { url } = await checkoutRes.json();
      window.location.href = url;
    } catch (e) {
      setError(e.message || "Something went wrong.");
      setLoading(false);
    }
  }

  if (!cart.ready) return null;

  if (cart.items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-24 text-center">
        <h1 className="font-serif-display text-3xl mb-4">Your cart is empty</h1>
        <p className="text-white/60 mb-8">You haven&apos;t designed a constellation yet.</p>
        <Link href="/design" className="rounded-full bg-amber-300 text-black font-semibold px-7 py-3">
          Start Designing
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-5 py-12">
      <h1 className="font-serif-display text-4xl mb-8">Your Cart</h1>

      <div className="space-y-4 mb-10">
        {cart.items.map((item) => {
          const color = getShirtColor(item.colorKey);
          const size = getSize(item.sizeKey);
          return (
            <div key={item.id} className="flex gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <div className="w-24 shrink-0">
                <TshirtMockup colorHex={color.hex}>
                  <DesignCanvas
                    phrase={item.phrase}
                    subtitle={item.subtitle}
                    paletteKey={item.paletteKey}
                    shirtIsDark={color.dark}
                    resolution={140}
                  />
                </TshirtMockup>
              </div>
              <div className="flex-1">
                <p className="font-medium">“{item.phrase}”{item.subtitle ? ` — ${item.subtitle}` : ""}</p>
                <p className="text-sm text-white/50">
                  {color.name} · Size {size.label}
                </p>
                <div className="flex items-center gap-3 mt-3">
                  <div className="flex items-center border border-white/20 rounded-lg text-sm">
                    <button
                      className="px-2.5 py-1 hover:bg-white/10"
                      onClick={() => cart.updateQty(item.id, Math.max(1, item.qty - 1))}
                    >
                      −
                    </button>
                    <span className="px-3">{item.qty}</span>
                    <button
                      className="px-2.5 py-1 hover:bg-white/10"
                      onClick={() => cart.updateQty(item.id, Math.min(10, item.qty + 1))}
                    >
                      +
                    </button>
                  </div>
                  <button
                    className="text-sm text-white/40 hover:text-red-300"
                    onClick={() => cart.removeItem(item.id)}
                  >
                    Remove
                  </button>
                </div>
              </div>
              <div className="text-right font-medium">
                ${((priceForSize(item.sizeKey) * item.qty) / 100).toFixed(2)}
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6 space-y-2">
        <div className="flex justify-between text-white/70">
          <span>Subtotal</span>
          <span>${(subtotalCents / 100).toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-white/70">
          <span>Shipping (US, Standard)</span>
          <span>${(shippingCents / 100).toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-lg font-semibold pt-2 border-t border-white/10">
          <span>Total</span>
          <span>${((subtotalCents + shippingCents) / 100).toFixed(2)}</span>
        </div>
      </div>

      {error && <p className="text-red-300 text-sm mt-4">{error}</p>}

      <button
        onClick={handleCheckout}
        disabled={loading}
        className="mt-6 w-full rounded-full bg-amber-300 text-black font-semibold py-3.5 hover:bg-amber-200 transition disabled:opacity-50"
      >
        {loading ? "Preparing your order…" : "Checkout with Stripe"}
      </button>
      <p className="text-xs text-white/35 mt-3 text-center">
        Ships within the US only for now. Payment is processed securely by Stripe — we never see
        your card details. Your shirt is only sent to print after payment succeeds.
      </p>
    </div>
  );
}
