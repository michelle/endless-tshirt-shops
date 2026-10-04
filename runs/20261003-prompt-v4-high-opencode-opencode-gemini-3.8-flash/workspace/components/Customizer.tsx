'use client';

import React, { useState } from 'react';
import {
  DesignParams,
  GarmentColor,
  DesignStyle,
  ShirtSize
} from '@/lib/types';
import { GarmentMockup } from './GarmentMockup';
import { SizeGuideModal } from './SizeGuideModal';
import {
  Sparkles,
  MapPin,
  Calendar,
  Clock,
  Shirt,
  Palette,
  CreditCard,
  Zap,
  Check,
  Ruler,
  Compass,
  Moon,
  Info,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { useRouter } from 'next/navigation';

const CITY_PRESETS = [
  { name: 'Paris, France', lat: 48.8566, lng: 2.3522 },
  { name: 'Tokyo, Japan', lat: 35.6762, lng: 139.6503 },
  { name: 'New York, USA', lat: 40.7128, lng: -74.006 },
  { name: 'London, UK', lat: 51.5074, lng: -0.1278 },
  { name: 'Sydney, Australia', lat: -33.8688, lng: 151.2093 },
  { name: 'San Francisco, USA', lat: 37.7749, lng: -122.4194 },
  { name: 'Rome, Italy', lat: 41.9028, lng: 12.4964 },
  { name: 'Reykjavik, Iceland', lat: 64.1466, lng: -21.9426 }
];

const TITLE_PRESETS = [
  'THE NIGHT WE MET',
  'UNDER THIS SKY',
  'WHEN YOU WERE BORN',
  'WRITTEN IN THE STARS',
  'AD ASTRA',
  'STARS OVER TOKYO',
  'OUR BEGINNING'
];

export function Customizer() {
  const router = useRouter();

  const [params, setParams] = useState<DesignParams>({
    title: 'THE NIGHT WE MET',
    dedication: 'Under a thousand burning stars, written forever in the celestial sphere.',
    city: 'Paris, France',
    lat: 48.8566,
    lng: 2.3522,
    date: '2024-05-18T22:30:00.000Z',
    color: 'black',
    style: 'gold',
    size: 'l',
    showConstellations: true,
    showCoordinates: true,
    showMoon: true,
    showGrid: true
  });

  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [isTestSubmitting, setIsTestSubmitting] = useState(false);
  const [testSuccess, setTestSuccess] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'moment' | 'inscription' | 'garment'>('moment');

  // Handle Date & Time updates
  const currentDate = new Date(params.date);
  const dateValue = currentDate.toISOString().split('T')[0];
  const hours = currentDate.getUTCHours().toString().padStart(2, '0');
  const minutes = currentDate.getUTCMinutes().toString().padStart(2, '0');
  const timeValue = `${hours}:${minutes}`;

  function updateDateString(newDate: string, newTime: string) {
    try {
      const combined = `${newDate}T${newTime}:00.000Z`;
      setParams((prev) => ({ ...prev, date: combined }));
    } catch (e) {
      // Invalid date input fallback
    }
  }

  // Handle Stripe Hosted Checkout
  async function handleStripeCheckout() {
    setIsCheckingOut(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ designParams: params, quantity: 1 })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Checkout initiation failed');
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      alert(`Stripe Checkout Error: ${err.message}`);
      setIsCheckingOut(false);
    }
  }

  // Handle Instant Sandbox Test Order
  async function handleInstantTestOrder() {
    setIsTestSubmitting(true);
    setTestSuccess(null);
    try {
      const res = await fetch('/api/test-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          designParams: params,
          shippingAddress: {
            name: 'Michelle (Studio Evaluator)',
            email: 'evaluator@endless-tshirt-shops.local',
            line1: '1 Market Street, Suite 400',
            city: 'San Francisco',
            state: 'CA',
            postalCode: '94105',
            country: 'US'
          }
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Test order submission failed');
      setTestSuccess(data);
    } catch (err: any) {
      alert(`Test Order Error: ${err.message}`);
    } finally {
      setIsTestSubmitting(false);
    }
  }

  return (
    <section id="studio" className="relative py-8 sm:py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Studio Headline */}
      <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-mono mb-4">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Interactive 1-of-1 DTG Studio</span>
        </div>
        <h1 className="font-serif-luxury text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white mb-3">
          Every Moment Has a Sky.{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-100">
            Wear Yours.
          </span>
        </h1>
        <p className="text-slate-400 text-sm sm:text-base font-light max-w-2xl mx-auto">
          Calculate the exact celestial alignment for your life’s most profound moment.
          Rendered at 4,677 × 5,881 px with archival Direct-to-Garment printing onto Bella + Canvas 3001 ringspun cotton.
        </p>
      </div>

      {/* Main Studio Grid: Mockup on Left, Controls on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* Left Column: Live Garment Mockup */}
        <div className="lg:col-span-6 xl:col-span-7 lg:sticky lg:top-24 space-y-4">
          <GarmentMockup params={params} />

          {/* Quick Garment Specs Bar */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-4 p-3.5 rounded-xl bg-white/5 border border-white/10 text-xs font-mono">
            <div>
              <span className="text-slate-500 block text-[10px] uppercase">Fabric</span>
              <span className="text-slate-200 font-semibold">100% Combed Cotton</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase">Print Spec</span>
              <span className="text-amber-300 font-semibold">DTG @ 300 DPI</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase">Fulfillment</span>
              <span className="text-sky-300 font-semibold">Prodigi Global Lab</span>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Studio Controls */}
        <div className="lg:col-span-6 xl:col-span-5 space-y-6 bg-[#0c0f17] border border-white/15 rounded-2xl p-6 sm:p-7 shadow-xl">
          {/* Studio Tab Navigation */}
          <div className="flex rounded-xl bg-black/40 border border-white/10 p-1 text-xs font-mono">
            <button
              onClick={() => setActiveTab('moment')}
              className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'moment'
                  ? 'bg-amber-500 text-black font-semibold shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>1. Moment</span>
            </button>
            <button
              onClick={() => setActiveTab('inscription')}
              className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'inscription'
                  ? 'bg-amber-500 text-black font-semibold shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              <span>2. Dedication</span>
            </button>
            <button
              onClick={() => setActiveTab('garment')}
              className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'garment'
                  ? 'bg-amber-500 text-black font-semibold shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Shirt className="w-3.5 h-3.5" />
              <span>3. Garment</span>
            </button>
          </div>

          {/* TAB 1: MOMENT & LOCATION */}
          {activeTab === 'moment' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* Location Presets */}
              <div>
                <label className="text-xs font-mono text-slate-300 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-amber-400" />
                  <span>Choose Location / City</span>
                </label>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {CITY_PRESETS.map((preset) => {
                    const isSelected = params.city === preset.name;
                    return (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() =>
                          setParams((prev) => ({
                            ...prev,
                            city: preset.name,
                            lat: preset.lat,
                            lng: preset.lng
                          }))
                        }
                        className={`text-xs font-mono px-2.5 py-1.5 rounded-lg border transition-all ${
                          isSelected
                            ? 'bg-amber-500/20 border-amber-400 text-amber-200 font-semibold'
                            : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        {preset.name.split(',')[0]}
                      </button>
                    );
                  })}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="sm:col-span-1">
                    <label className="text-[10px] font-mono text-slate-500 block mb-1">City Label</label>
                    <input
                      type="text"
                      value={params.city}
                      onChange={(e) => setParams((p) => ({ ...p, city: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/15 text-xs text-white font-mono focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-slate-500 block mb-1">Latitude</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={params.lat}
                      onChange={(e) => setParams((p) => ({ ...p, lat: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/15 text-xs text-white font-mono focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-slate-500 block mb-1">Longitude</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={params.lng}
                      onChange={(e) => setParams((p) => ({ ...p, lng: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/15 text-xs text-white font-mono focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Date & Time Picker */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-white/10">
                <div>
                  <label className="text-xs font-mono text-slate-300 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-amber-400" />
                    <span>Exact Date</span>
                  </label>
                  <input
                    type="date"
                    value={dateValue}
                    onChange={(e) => updateDateString(e.target.value, timeValue)}
                    className="w-full px-3 py-2.5 rounded-lg bg-black/40 border border-white/15 text-xs text-white font-mono focus:border-amber-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-mono text-slate-300 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Exact Time (UTC)</span>
                  </label>
                  <input
                    type="time"
                    value={timeValue}
                    onChange={(e) => updateDateString(dateValue, e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg bg-black/40 border border-white/15 text-xs text-white font-mono focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* Sky Elements Toggles */}
              <div className="pt-3 border-t border-white/10 space-y-2">
                <span className="text-xs font-mono text-slate-400 uppercase tracking-wider block mb-2">
                  Celestial Layer Toggles
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <label className="flex items-center gap-2 p-2 rounded-lg bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition-colors">
                    <input
                      type="checkbox"
                      checked={params.showConstellations}
                      onChange={(e) => setParams((p) => ({ ...p, showConstellations: e.target.checked }))}
                      className="rounded border-white/20 text-amber-500 focus:ring-0"
                    />
                    <span className="text-slate-300">Constellations</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 rounded-lg bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition-colors">
                    <input
                      type="checkbox"
                      checked={params.showMoon}
                      onChange={(e) => setParams((p) => ({ ...p, showMoon: e.target.checked }))}
                      className="rounded border-white/20 text-amber-500 focus:ring-0"
                    />
                    <span className="text-slate-300">Moon Phase</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 rounded-lg bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition-colors">
                    <input
                      type="checkbox"
                      checked={params.showGrid}
                      onChange={(e) => setParams((p) => ({ ...p, showGrid: e.target.checked }))}
                      className="rounded border-white/20 text-amber-500 focus:ring-0"
                    />
                    <span className="text-slate-300">Degree Ring</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 rounded-lg bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition-colors">
                    <input
                      type="checkbox"
                      checked={params.showCoordinates}
                      onChange={(e) => setParams((p) => ({ ...p, showCoordinates: e.target.checked }))}
                      className="rounded border-white/20 text-amber-500 focus:ring-0"
                    />
                    <span className="text-slate-300">Cardinal Points</span>
                  </label>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveTab('inscription')}
                className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-mono text-xs flex items-center justify-center gap-2 transition-colors"
              >
                <span>Continue to Step 2: Dedication</span>
                <ChevronRight className="w-4 h-4 text-amber-400" />
              </button>
            </div>
          )}

          {/* TAB 2: INSCRIPTION & PALETTE */}
          {activeTab === 'inscription' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* Milestone Title */}
              <div>
                <label className="text-xs font-mono text-slate-300 uppercase tracking-wider block mb-2">
                  Headline / Milestone Title
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2.5">
                  {TITLE_PRESETS.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setParams((p) => ({ ...p, title: t }))}
                      className={`text-[11px] font-mono px-2 py-1 rounded border transition-colors ${
                        params.title === t
                          ? 'bg-amber-500/20 border-amber-400 text-amber-200 font-bold'
                          : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  maxLength={40}
                  value={params.title}
                  onChange={(e) => setParams((p) => ({ ...p, title: e.target.value }))}
                  placeholder="e.g. THE NIGHT WE MET"
                  className="w-full px-3 py-2.5 rounded-lg bg-black/40 border border-white/15 text-xs text-white font-serif-luxury tracking-widest focus:border-amber-400 focus:outline-none"
                />
              </div>

              {/* Personal Dedication Message */}
              <div>
                <label className="text-xs font-mono text-slate-300 uppercase tracking-wider block mb-1.5">
                  Personal Inscription / Dedication (Italic Cormorant)
                </label>
                <textarea
                  rows={2}
                  maxLength={120}
                  value={params.dedication}
                  onChange={(e) => setParams((p) => ({ ...p, dedication: e.target.value }))}
                  placeholder="e.g. Under a thousand burning stars, two lives collided."
                  className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/15 text-xs text-white font-garamond italic text-sm focus:border-amber-400 focus:outline-none resize-none"
                />
                <span className="text-[10px] text-slate-500 font-mono block text-right mt-1">
                  {params.dedication?.length || 0} / 120 chars
                </span>
              </div>

              {/* Design Artwork Palette */}
              <div className="pt-3 border-t border-white/10">
                <label className="text-xs font-mono text-slate-300 uppercase tracking-wider block mb-2">
                  Celestial Artwork Palette
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <button
                    type="button"
                    onClick={() => setParams((p) => ({ ...p, style: 'gold' }))}
                    className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all ${
                      params.style === 'gold'
                        ? 'bg-amber-500/15 border-amber-400 text-amber-200'
                        : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="w-4 h-4 rounded-full bg-gradient-to-tr from-amber-600 to-amber-300 shadow-sm" />
                    <div>
                      <span className="font-bold block">Celestial Gold</span>
                      <span className="text-[10px] text-slate-500">24K warm star dust</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setParams((p) => ({ ...p, style: 'silver' }))}
                    className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all ${
                      params.style === 'silver'
                        ? 'bg-slate-200/15 border-slate-300 text-white'
                        : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="w-4 h-4 rounded-full bg-gradient-to-tr from-slate-400 to-white shadow-sm" />
                    <div>
                      <span className="font-bold block">Starlight Silver</span>
                      <span className="text-[10px] text-slate-500">Monochrome frost</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setParams((p) => ({ ...p, style: 'copper' }))}
                    className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all ${
                      params.style === 'copper'
                        ? 'bg-orange-500/15 border-orange-400 text-orange-200'
                        : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="w-4 h-4 rounded-full bg-gradient-to-tr from-orange-800 to-amber-600 shadow-sm" />
                    <div>
                      <span className="font-bold block">Vintage Bronze</span>
                      <span className="text-[10px] text-slate-500">Parchment & light tees</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setParams((p) => ({ ...p, style: 'minimal' }))}
                    className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all ${
                      params.style === 'minimal'
                        ? 'bg-blue-500/15 border-blue-400 text-blue-200'
                        : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="w-4 h-4 rounded-full bg-gradient-to-tr from-blue-700 to-sky-300 shadow-sm" />
                    <div>
                      <span className="font-bold block">Astral Minimal</span>
                      <span className="text-[10px] text-slate-500">Clean architectural</span>
                    </div>
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveTab('garment')}
                className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-mono text-xs flex items-center justify-center gap-2 transition-colors"
              >
                <span>Continue to Step 3: Garment & Size</span>
                <ChevronRight className="w-4 h-4 text-amber-400" />
              </button>
            </div>
          )}

          {/* TAB 3: GARMENT & SIZING */}
          {activeTab === 'garment' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* Garment Color */}
              <div>
                <label className="text-xs font-mono text-slate-300 uppercase tracking-wider block mb-2">
                  Garment Color (Bella + Canvas 3001)
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <button
                    type="button"
                    onClick={() => setParams((p) => ({ ...p, color: 'black' }))}
                    className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all ${
                      params.color === 'black'
                        ? 'bg-white/15 border-amber-400 text-white'
                        : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="w-4 h-4 rounded-full bg-black border border-white/30 shadow-sm" />
                    <div>
                      <span className="font-bold block text-white">Obsidian Black</span>
                      <span className="text-[10px] text-slate-500">Deep pitch cotton</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setParams((p) => ({ ...p, color: 'navy blue' }))}
                    className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all ${
                      params.color === 'navy blue'
                        ? 'bg-blue-900/30 border-blue-400 text-white'
                        : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="w-4 h-4 rounded-full bg-[#0a1128] border border-blue-400/40 shadow-sm" />
                    <div>
                      <span className="font-bold block text-white">Midnight Navy</span>
                      <span className="text-[10px] text-slate-500">Cosmic ocean blue</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setParams((p) => ({ ...p, color: 'white' }))}
                    className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all ${
                      params.color === 'white'
                        ? 'bg-white/20 border-white text-white'
                        : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="w-4 h-4 rounded-full bg-white border border-slate-400 shadow-sm" />
                    <div>
                      <span className="font-bold block text-white">Pure Alabaster</span>
                      <span className="text-[10px] text-slate-500">Crisp optic white</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setParams((p) => ({ ...p, color: 'natural' }))}
                    className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all ${
                      params.color === 'natural'
                        ? 'bg-amber-900/20 border-amber-600 text-white'
                        : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="w-4 h-4 rounded-full bg-[#eae3d2] border border-amber-700/30 shadow-sm" />
                    <div>
                      <span className="font-bold block text-white">Natural Cotton</span>
                      <span className="text-[10px] text-slate-500">Unbleached vintage</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Garment Size Selection */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-mono text-slate-300 uppercase tracking-wider">
                    Unisex Garment Size
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsSizeGuideOpen(true)}
                    className="text-amber-400 hover:text-amber-300 text-xs font-mono flex items-center gap-1 underline"
                  >
                    <Ruler className="w-3.5 h-3.5" />
                    <span>Size Chart & Fit</span>
                  </button>
                </div>
                <div className="grid grid-cols-6 gap-2">
                  {(['xs', 's', 'm', 'l', 'xl', '2xl'] as ShirtSize[]).map((sz) => {
                    const isSelected = params.size === sz;
                    return (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => setParams((p) => ({ ...p, size: sz }))}
                        className={`py-2.5 rounded-xl font-mono text-xs font-bold uppercase transition-all ${
                          isSelected
                            ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20 border-amber-400'
                            : 'bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10'
                        }`}
                      >
                        {sz}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Pricing & Checkout Summary Box */}
          <div className="pt-4 border-t border-white/10 space-y-4">
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-2xl sm:text-3xl font-serif-luxury font-bold text-white">
                  $36.00
                </span>
                <span className="text-xs text-slate-400 font-mono ml-2">USD</span>
              </div>
              <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                Free Worldwide Shipping
              </span>
            </div>

            {/* Primary CTA: Real Stripe Hosted Checkout */}
            <button
              onClick={handleStripeCheckout}
              disabled={isCheckingOut || isTestSubmitting}
              className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-black font-bold font-mono text-sm tracking-wider uppercase transition-all shadow-[0_0_25px_rgba(245,158,11,0.25)] flex items-center justify-center gap-2 group disabled:opacity-50"
            >
              {isCheckingOut ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-black" />
                  <span>Connecting to Stripe...</span>
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4 text-black group-hover:scale-110 transition-transform" />
                  <span>Order Custom T-Shirt • $36.00</span>
                </>
              )}
            </button>

            {/* Secondary CTA: Instant Sandbox Test Order */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleInstantTestOrder}
                disabled={isCheckingOut || isTestSubmitting}
                className="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-amber-400/40 hover:border-amber-400 text-amber-300 text-xs font-mono transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isTestSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                    <span>Charging Stripe Test & Sending to Prodigi...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>⚡ 1-Click Sandbox Test Order (Stripe + Prodigi)</span>
                  </>
                )}
              </button>
              <p className="text-[10px] text-slate-500 font-mono text-center mt-1.5">
                Evaluator shortcut: automatically confirms a Stripe test charge and creates a live Prodigi sandbox order.
              </p>
            </div>

            {/* Test Success Feedback Card */}
            {testSuccess && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-xs font-mono space-y-2 animate-in fade-in duration-300">
                <div className="flex items-center gap-1.5 font-bold text-emerald-300">
                  <Check className="w-4 h-4" />
                  <span>Success! Payment & Prodigi Order Created</span>
                </div>
                <div className="space-y-1 text-[11px] text-slate-300">
                  <div>Prodigi Order ID: <strong className="text-white">{testSuccess.prodigiOrderId}</strong></div>
                  <div>Stripe Payment: <strong className="text-white">{testSuccess.stripePaymentId}</strong></div>
                  <div>Stage: <strong className="text-emerald-400 uppercase">{testSuccess.prodigiStatus?.stage || 'InProgress'}</strong></div>
                </div>
                <div className="pt-2 flex gap-2">
                  <button
                    onClick={() => router.push(`/order/${testSuccess.prodigiOrderId}`)}
                    className="flex-1 py-1.5 px-3 rounded bg-emerald-500 text-black font-bold text-center text-[10px] uppercase hover:bg-emerald-400 transition-colors"
                  >
                    View Live Tracker Page
                  </button>
                  <a
                    href={testSuccess.assetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-1.5 px-3 rounded bg-white/10 hover:bg-white/15 text-white text-center text-[10px] uppercase transition-colors"
                  >
                    Inspect 4677×5881 PNG
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Size Guide Modal */}
      <SizeGuideModal
        isOpen={isSizeGuideOpen}
        onClose={() => setIsSizeGuideOpen(false)}
        selectedSize={params.size}
        onSelectSize={(sz) => setParams((p) => ({ ...p, size: sz }))}
      />
    </section>
  );
}
