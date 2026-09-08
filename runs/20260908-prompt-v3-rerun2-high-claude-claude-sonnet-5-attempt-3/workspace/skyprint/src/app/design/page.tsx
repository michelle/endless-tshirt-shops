"use client";

import { Elements } from "@stripe/react-stripe-js";
import { NavBar, Footer } from "@/components/NavBar";
import { DesignForm } from "./DesignForm";
import { getStripeClient } from "@/lib/stripeClient";

const stripePromise = getStripeClient();
const hasStripeKey = Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

export default function DesignPage() {
  return (
    <>
      <NavBar />
      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-6 pt-10">
          <h1 className="text-3xl font-serif font-semibold">Design your sky</h1>
          <p className="text-white/60 mt-2 max-w-2xl">
            Pick a date, time and place. We&apos;ll render the real moon phase and a one-of-a-kind
            star field for that exact moment, and print it to order.
          </p>
        </div>
        {hasStripeKey ? (
          <Elements stripe={stripePromise}>
            <DesignForm />
          </Elements>
        ) : (
          <div className="max-w-6xl mx-auto px-6 py-16">
            <div className="rounded-xl border border-amber-200/30 bg-amber-200/10 px-6 py-5 text-amber-100">
              Payments aren&apos;t configured on this deployment yet (missing
              <code className="mx-1 px-1.5 py-0.5 rounded bg-black/30">NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code>
              / <code className="mx-1 px-1.5 py-0.5 rounded bg-black/30">STRIPE_SECRET_KEY</code>). Checkout is
              disabled until those are set.
            </div>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
