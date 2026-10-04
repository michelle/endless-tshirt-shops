'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { GarmentMockup } from '@/components/GarmentMockup';
import {
  Package,
  Truck,
  CheckCircle2,
  Clock,
  ExternalLink,
  Loader2,
  AlertCircle,
  RefreshCw,
  ArrowLeft
} from 'lucide-react';

export default function OrderPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orderRecord, setOrderRecord] = useState<any>(null);

  async function fetchStatus() {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/order/${encodeURIComponent(id)}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch order information.');
      }
      setOrderRecord(data);
    } catch (err: any) {
      setError(err.message || 'Error querying order.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchStatus();
  }, [id]);

  const pOrder = orderRecord?.prodigiStatus || orderRecord?.order?.prodigiStatus;
  const designParams = orderRecord?.order?.designParams;
  const stage = pOrder?.status?.stage || 'Processing';
  const shipments = pOrder?.shipments || [];

  return (
    <div className="min-h-screen flex flex-col bg-[#07090e] stars-bg text-slate-100">
      <Navbar />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
        <button
          onClick={() => router.push('/')}
          className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Studio</span>
        </button>

        {loading ? (
          <div className="py-24 text-center space-y-4">
            <Loader2 className="w-8 h-8 animate-spin text-amber-400 mx-auto" />
            <p className="text-slate-400 text-xs font-mono">Querying Prodigi API...</p>
          </div>
        ) : error ? (
          <div className="max-w-md mx-auto p-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-center space-y-3 font-mono">
            <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
            <h2 className="text-sm font-bold text-white">Order Not Found</h2>
            <p className="text-rose-200 text-xs">{error}</p>
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-widest text-amber-400 block mb-1">
                  Live Production Tracker
                </span>
                <h1 className="font-serif-luxury text-2xl sm:text-3xl font-bold text-white">
                  Order {pOrder?.id || id}
                </h1>
              </div>
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono uppercase font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {stage}
                </span>
                <button
                  onClick={fetchStatus}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                  title="Refresh"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Shipments block */}
            {shipments.length > 0 && (
              <div className="p-6 rounded-2xl bg-sky-500/10 border border-sky-500/30 space-y-3 font-mono text-xs">
                <div className="flex items-center gap-2 text-sky-300 font-bold">
                  <Truck className="w-4 h-4" />
                  <span>Shipment Dispatched via {shipments[0]?.carrier?.name?.toUpperCase() || 'STANDARD'}</span>
                </div>
                {shipments[0]?.tracking?.number && (
                  <div className="text-slate-300">
                    Tracking Number: <strong className="text-amber-300">{shipments[0].tracking.number}</strong>
                  </div>
                )}
                {shipments[0]?.tracking?.url && (
                  <a
                    href={shipments[0].tracking.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-amber-400 hover:text-amber-300 underline font-bold"
                  >
                    <span>Track on Carrier Website</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            )}

            {/* Content split */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
              {designParams && (
                <div className="md:col-span-6">
                  <GarmentMockup params={designParams} />
                </div>
              )}

              <div className={`space-y-6 ${designParams ? 'md:col-span-6' : 'md:col-span-12'}`}>
                {/* Details box */}
                <div className="p-6 rounded-2xl bg-[#0c0f17] border border-white/10 space-y-3 font-mono text-xs">
                  <h3 className="font-serif-luxury text-sm font-bold text-white uppercase tracking-wider border-b border-white/10 pb-2">
                    Prodigi Fulfillment Status
                  </h3>
                  <div className="space-y-2 text-slate-300">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Prodigi Reference:</span>
                      <span className="text-white">{pOrder?.merchantReference || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Asset Ingest:</span>
                      <span className="text-emerald-400 font-bold">
                        {pOrder?.status?.details?.downloadAssets || 'Complete'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Print Ready Preparation:</span>
                      <span className="text-slate-200">
                        {pOrder?.status?.details?.printReadyAssetsPrepared || 'Ready'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Production Lab Allocation:</span>
                      <span className="text-slate-200">
                        {pOrder?.status?.details?.allocateProductionLocation || 'Assigned'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Garment Blank:</span>
                      <span className="text-amber-300">
                        {pOrder?.items?.[0]?.sku || 'GLOBAL-TEE-BC-3001'}
                      </span>
                    </div>
                  </div>

                  {pOrder?.items?.[0]?.assets?.[0]?.url && (
                    <div className="pt-3 border-t border-white/10">
                      <a
                        href={pOrder.items[0].assets[0].url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-amber-400 hover:text-amber-300 font-bold underline"
                      >
                        <span>Inspect Original 4677×5881 px Print File</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}
                </div>

                {/* Recipient box */}
                {pOrder?.recipient && (
                  <div className="p-6 rounded-2xl bg-[#0c0f17] border border-white/10 space-y-2 font-mono text-xs">
                    <h3 className="font-serif-luxury text-sm font-bold text-white uppercase tracking-wider border-b border-white/10 pb-2">
                      Recipient
                    </h3>
                    <div className="space-y-1 text-slate-300">
                      <div className="font-bold text-white">{pOrder.recipient.name}</div>
                      <div>{pOrder.recipient.address?.line1}</div>
                      {pOrder.recipient.address?.line2 && <div>{pOrder.recipient.address.line2}</div>}
                      <div>
                        {pOrder.recipient.address?.townOrCity}, {pOrder.recipient.address?.stateOrCounty} {pOrder.recipient.address?.postalOrZipCode}
                      </div>
                      <div className="text-slate-500">{pOrder.recipient.address?.countryCode}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
