'use client';

import React from 'react';
import { Layers, Sparkles, Cpu, Award, Globe2, Heart, CheckCircle2 } from 'lucide-react';

export function BrandStory() {
  const features = [
    {
      icon: Cpu,
      title: 'DTG Micro-Resolution (300 DPI)',
      description:
        'Direct-to-Garment printing deposits eco-friendly, water-based pigment directly into cotton fibers at 4,677 × 5,881 px. This enables razor-sharp constellation hairlines and individual stellar magnitudes impossible with legacy screen printing.'
    },
    {
      icon: Sparkles,
      title: 'True 1-of-1 Bespoke Garments',
      description:
        'Screen printing requires costly burning of aluminum screens per color, restricting runs to bulk duplicates. DTG empowers us to engineer a unique, individualized astronomical map for every single order with zero setup plates.'
    },
    {
      icon: Award,
      title: 'Bella + Canvas 3001 Blank Canvas',
      description:
        'Crafted from 100% Airlume combed and ringspun cotton (4.2 oz). The tight weave provides the smoothest printing surface in apparel, producing a buttery-soft hand feel that breathes with your body.'
    },
    {
      icon: Globe2,
      title: 'Prodigi Global Print Labs',
      description:
        'Orders are routed automatically to Prodigi’s nearest DTG fulfillment facility across North America, Europe, the UK, and Australasia—reducing transit carbon emissions and expediting doorstep arrival.'
    }
  ];

  const testimonials = [
    {
      name: 'Elena & Marcus',
      location: 'New York, NY',
      quote: 'We ordered the night we got engaged in Central Park. The gold starlight detail on the obsidian cotton is museum quality. You can literally read the coordinates down to the second.',
      title: '“THE NIGHT WE SAID YES”'
    },
    {
      name: 'David R.',
      location: 'London, UK',
      quote: 'Gifted this to my sister for the birth of her daughter. Seeing the exact alignment of Ursa Major and the moon phase from that night brought tears to her eyes. The print feels part of the fabric.',
      title: '“WHEN AURELIA ARRIVED”'
    },
    {
      name: 'Kenji T.',
      location: 'Tokyo, Japan',
      quote: 'As an amateur astronomer, I was blown away by the celestial math accuracy. The sidereal time calculation and star catalog are spot-on. Truly high-fashion science.',
      title: '“SUMMER SOLSTICE OVER FUJI”'
    }
  ];

  return (
    <section className="py-16 sm:py-24 border-t border-white/10 bg-[#07090e]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16 sm:space-y-24">
        {/* Technology Section */}
        <div>
          <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
            <span className="text-xs font-mono uppercase tracking-widest text-amber-400 block mb-2">
              The Technology
            </span>
            <h2 className="font-serif-luxury text-2xl sm:text-4xl font-bold text-white tracking-tight">
              Why Direct-to-Garment (DTG) Changes Everything
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm font-light mt-3 max-w-2xl mx-auto">
              Until now, custom astronomical apparel was either cheap heat-transfer vinyl that peeled after two washes, or mass-produced generic star charts. DTG gives you fine-art grade archival printing directly onto luxury cotton.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feat, idx) => {
              const Icon = feat.icon;
              return (
                <div
                  key={idx}
                  className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-amber-400/40 transition-all space-y-3 group"
                >
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-serif-luxury text-base font-bold text-white tracking-wide">
                    {feat.title}
                  </h3>
                  <p className="text-slate-400 text-xs leading-relaxed font-light">
                    {feat.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Customer Stories & Reviews */}
        <div className="pt-8 border-t border-white/5">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-mono uppercase tracking-widest text-amber-400 block mb-2">
              Customer Stories
            </span>
            <h2 className="font-serif-luxury text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Moments Written in the Heavens
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, idx) => (
              <div
                key={idx}
                className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <span className="text-[11px] font-mono font-bold text-amber-400 tracking-wider">
                    {t.title}
                  </span>
                  <p className="text-slate-300 text-xs sm:text-sm italic font-garamond leading-relaxed">
                    "{t.quote}"
                  </p>
                </div>
                <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs font-mono">
                  <span className="text-white font-medium">{t.name}</span>
                  <span className="text-slate-500">{t.location}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
