import { stripeEnabled } from "@/lib/stripe";
import { isProdigiSandbox } from "@/lib/prodigi";
import { CheckoutForm } from "@/components/CheckoutForm";

export const metadata = { title: "Checkout — The Obsolete Guild" };

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ cancelled?: string }> }) {
  const sp = await searchParams;
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-3xl">Checkout</h1>
      {sp.cancelled && <p className="mt-3 rounded border border-rust/40 bg-rust/10 p-3 text-sm">Payment was cancelled. Your cart is still here.</p>}
      <CheckoutForm mode={stripeEnabled() ? "stripe" : "test"} sandbox={isProdigiSandbox()} />
    </div>
  );
}
