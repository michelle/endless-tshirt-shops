'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { GarmentMockup } from '@/components/GarmentMockup';
import {
  CheckCircle2,
  Clock,
  Package,
  Truck,
  ExternalLink,
  Loader2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import confetti from 'canvas-confetti';

function OrderSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get('session_id');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orderRecord, setOrderRecord] = useState<any>(null);

  useEffect(() => {
    if (!sessionId) {
      setError('No Stripe session ID was provided.');
      setLoading(false);
      return;
    }

    async function verifyOrder() {
      try {
        const res = await fetch(`/api/order/verify?session_id=${encodeURIComponent(sessionId!)}`);
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to verify payment with Stripe.');
        }

        setOrderRecord(data.order);

        // Fire celebratory confetti!
        try {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 }
          });
        } catch (e) {
          // Non-critical
        }
      } catch (err: any) {
        setError(err.message || 'An unexpected error occurred during order verification.');
      } finally {
        setLoading(false);
      }
    }

    verifyOrder();
  }, [sessionId]);

  const pOrder = orderRecord?.prodigiStatus;
  const stage = pOrder?.status?.stage || 'InProgress';
  const designParams = orderRecord?.designParams;

  return (
    <div className="min-h-screen flex flex-col bg-[#07090e] stars-bg text-slate-100">
      <Navbar />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
        {loading ? (
          <div className="py-24 text-center space-y-4">
            <Loader2 className="w-10 h-10 animate-spin text-amber-400 mx-auto" />
            <h2 className="font-serif-luxury text-2xl text-white">Verifying Payment & Routing to Prodigi...</h2>
            <p className="text-slate-400 text-xs font-mono">
              Confirming transaction with Stripe API and preparing print-ready assets...
            </p>
          </div>
        ) : error ? (
          <div className="max-w-lg mx-auto p-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-center space-y-4">
            <AlertTriangle className="w-10 h-10 text-rose-400 mx-auto" />
            <h2 className="font-serif-luxury text-xl font-bold text-white">Order Verification Notice</h2>
            <p className="text-rose-200 text-xs font-mono">{error}</p>
            <button
              onClick={() => router.push('/')}
              className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-mono"
            >
              Return to Studio
            </button>
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Success Banner */}
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <span className="text-xs font-mono uppercase tracking-widest text-emerald-400 font-bold block">
                Payment Succeeded • Prodigi Order Created
              </span>
              <h1 className="font-serif-luxury text-3xl sm:text-4xl font-bold text-white tracking-tight">
                Your Sky is in Production.
              </h1>
              <p className="text-slate-400 text-xs sm:text-sm font-light">
                Thank you! Your payment was verified by Stripe and your 1-of-1 star map design has been dispatched to Prodigi's DTG fulfillment lab.
              </p>
            </div>

            {/* Production Timeline Progress */}
            <div className="p-6 rounded-2xl bg-[#0c0f17] border border-white/10 shadow-xl space-y-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="space-y-1">
                  <span className="text-xs font-mono text-slate-400 block">Prodigi Sandbox Order ID:</span>
                  <span className="font-mono text-sm sm:text-base font-bold text-amber-300 bg-black/40 px-3 py-1 rounded-lg border border-white/10">
                    {orderRecord?.prodigiOrderId || pOrder?.id || 'ord_processing'}
                  </span>
                </div>
                <div className="text-right space-y-1">
                  <span className="text-xs font-mono text-slate-400 block">Current Stage:</span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono uppercase font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30">
                    <Clock className="w-3.5 h-3.5" />
                    {stage}
                  </span>
                </div>
              </div>

              {/* Progress Steps */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs font-mono">
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 space-y-1">
                  <span className="font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    1. Stripe Payment
                  </span>
                  <p className="text-[10px] text-slate-400">Paid ($36.00 USD)</p>
                </div>
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 space-y-1">
                  <span className="font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    2. Asset Render
                  </span>
                  <p className="text-[10px] text-slate-400">4677×5881 px PNG Ready</p>
                </div>
                <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-200 space-y-1">
                  <span className="font-bold flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-amber-400" />
                    3. Prodigi Ingest
                  </span>
                  <p className="text-[10px] text-slate-400">Download Complete</p>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-slate-400 space-y-1">
                  <span className="font-bold flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5" />
                    4. Shipping
                  </span>
                  <p className="text-[10px] text-slate-500">Royal Mail / Standard</p>
                </div>
              </div>
            </div>

            {/* Split Details: Garment on left, Recipient on right */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              {designParams && (
                <div className="md:col-span-6">
                  <GarmentMockup params={designParams} />
                </div>
              )}

              <div className="md:col-span-6 space-y-6">
                {/* Order Specification */}
                <div className="p-6 rounded-2xl bg-[#0c0f17] border border-white/10 space-y-4 font-mono text-xs">
                  <h3 className="font-serif-luxury text-sm font-bold text-white uppercase tracking-wider border-b border-white/10 pb-2">
                    Garment & Print Details
                  </h3>
                  <div className="space-y-2 text-slate-300">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Garment Style:</span>
                      <span className="text-white">Bella + Canvas 3001</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Color / Size:</span>
                      <span className="text-amber-300 uppercase">
                        {designParams?.color} • Size {designParams?.size}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Moment Headline:</span>
                      <span className="text-white font-serif-luxury">{designParams?.title}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Coordinates:</span>
                      <span className="text-slate-200">{designParams?.city}</span>
                    </div>
                  </div>

                  {/* High-res asset preview link */}
                  {orderRecord?.prodigiOrderId && (
                    <div className="pt-3 border-t border-white/10">
                      <a
                        href={`/api/design/d_${Buffer.from(JSON.stringify(designParams)).toString('base64url')}.png`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-amber-400 hover:text-amber-300 font-bold underline"
                      >
                        <span>View High-Resolution 4677×5881 Print Asset</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}
                </div>

                {/* Shipping Destination */}
                {orderRecord?.shippingAddress && (
                  <div className="p-6 rounded-2xl bg-[#0c0f17] border border-white/10 space-y-3 font-mono text-xs">
                    <h3 className="font-serif-luxury text-sm font-bold text-white uppercase tracking-wider border-b border-white/10 pb-2">
                      Shipping Destination
                    </h3>
                    <div className="space-y-1 text-slate-300">
                      <div className="font-bold text-white">{orderRecord.shippingAddress.name}</div>
                      <div>{orderRecord.shippingAddress.line1}</div>
                      {orderRecord.shippingAddress.line2 && <div>{orderRecord.shippingAddress.line2}</div>}
                      <div>
                        {orderRecord.shippingAddress.city}, {orderRecord.shippingAddress.state} {orderRecord.shippingAddress.postalCode}
                      </div>
                      <div className="text-slate-500">{orderRecord.shippingAddress.country}</div>
                      <div className="text-slate-400 text-[11px] pt-1">{orderRecord.shippingAddress.email}</div>
                    </div>
                  </div>
                )}

                {/* Action button */}
                <div className="flex gap-3">
                  <button
                    onClick={() => router.push('/')}
                    className="flex-1 py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold font-mono text-xs uppercase tracking-wider transition-colors text-center"
                  >
                    Customize Another Shirt
                  </button>
                  <button
                    onClick={() => window.location.reload()}
                    className="p-3 rounded-xl bg-white/10 hover:bg-white/15 text-white transition-colors"
                    title="Refresh Status"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#07090e] flex items-center justify-center text-amber-400 font-mono text-sm">
          Loading order details...
        </div>
      }
    >
      <OrderSuccessContent />
    </Suspense>
  );
}
