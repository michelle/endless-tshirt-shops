'use client';

import React, { useState } from 'react';
import { X, Search, Package, Truck, CheckCircle2, Clock, ExternalLink, AlertCircle } from 'lucide-react';

interface OrderTrackerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function OrderTrackerModal({ isOpen, onClose }: OrderTrackerModalProps) {
  const [searchId, setSearchId] = useState('');
  const [loading, setLoading] = useState(false);
  const [orderData, setOrderData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!searchId.trim()) return;

    setLoading(true);
    setError(null);
    setOrderData(null);

    try {
      const res = await fetch(`/api/order/${encodeURIComponent(searchId.trim())}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Order lookup failed');
      }
      setOrderData(data);
    } catch (err: any) {
      setError(err.message || 'Failed to locate order');
    } finally {
      setLoading(false);
    }
  }

  const pOrder = orderData?.prodigiStatus || orderData?.order?.prodigiStatus;
  const stage = pOrder?.status?.stage || 'Unknown';
  const shipments = pOrder?.shipments || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-[#0f131c] border border-white/15 rounded-2xl shadow-2xl p-6 sm:p-8 overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Package className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h3 className="font-serif-luxury text-lg font-bold text-white tracking-wider">
                LIVE PRODUCTION & SHIPMENT TRACKER
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Query Prodigi Global Print Network & Fulfillment
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search input form */}
        <form onSubmit={handleSearch} className="mt-5 flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              placeholder="Enter Prodigi Order ID (e.g. ord_1176986) or Session ID"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white text-xs font-mono focus:outline-none focus:border-amber-400 transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-semibold text-xs tracking-wider uppercase font-mono transition-colors"
          >
            {loading ? 'Tracking...' : 'Lookup'}
          </button>
        </form>

        {/* Error message */}
        {error && (
          <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2 font-mono">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Results */}
        {pOrder && (
          <div className="mt-6 space-y-4 animate-in fade-in duration-300 font-mono text-xs">
            {/* Status overview card */}
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Prodigi Order ID:</span>
                <span className="font-bold text-white bg-black/40 px-2 py-0.5 rounded border border-white/10">
                  {pOrder.id}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Production Stage:</span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 font-bold uppercase">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {stage}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Created:</span>
                <span className="text-slate-200">
                  {new Date(pOrder.created).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Garment SKU:</span>
                <span className="text-amber-300">
                  {pOrder.items?.[0]?.sku || 'GLOBAL-TEE-BC-3001'}
                </span>
              </div>
              {pOrder.items?.[0]?.attributes && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Specs:</span>
                  <span className="text-slate-200 uppercase">
                    Color: {pOrder.items[0].attributes.color} • Size: {pOrder.items[0].attributes.size}
                  </span>
                </div>
              )}
            </div>

            {/* Asset Status */}
            {pOrder.items?.[0]?.assets?.[0] && (
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Print Asset Download:</span>
                  <span className="text-emerald-400 font-bold">
                    {pOrder.items[0].assets[0].status || 'Complete'}
                  </span>
                </div>
                {pOrder.items[0].assets[0].url && (
                  <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                    <span className="text-slate-400">High-Res Print Asset:</span>
                    <a
                      href={pOrder.items[0].assets[0].url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-amber-400 hover:text-amber-300 underline flex items-center gap-1"
                    >
                      Inspect 4677×5881 PNG <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* Shipments info */}
            {shipments.length > 0 ? (
              <div className="p-4 rounded-xl bg-sky-500/10 border border-sky-500/20 space-y-2">
                <div className="flex items-center gap-2 text-sky-300 font-bold">
                  <Truck className="w-4 h-4" />
                  <span>Shipment Dispatched</span>
                </div>
                {shipments.map((shp: any, idx: number) => (
                  <div key={idx} className="space-y-1.5 pt-2 border-t border-sky-500/15">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Carrier:</span>
                      <span className="text-slate-200 uppercase">{shp.carrier?.name || 'Standard'}</span>
                    </div>
                    {shp.tracking?.number && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Tracking Number:</span>
                        <span className="text-amber-300">{shp.tracking.number}</span>
                      </div>
                    )}
                    {shp.tracking?.url && (
                      <div className="pt-1 flex justify-end">
                        <a
                          href={shp.tracking.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-amber-400 hover:text-amber-300 underline flex items-center gap-1"
                        >
                          Carrier Tracking Portal <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2 text-slate-400">
                <Clock className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span>Order is being prepared in the production queue at Prodigi's fulfillment facility. Tracking information will be assigned upon dispatch.</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
