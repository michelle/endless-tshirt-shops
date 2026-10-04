'use client';

import React, { useState } from 'react';
import { DesignParams } from '@/lib/types';
import { generateCelestialSvg } from '@/lib/generator';
import { ZoomIn, ZoomOut, Layers, Eye } from 'lucide-react';

interface GarmentMockupProps {
  params: DesignParams;
}

export function GarmentMockup({ params }: GarmentMockupProps) {
  const [isZoomed, setIsZoomed] = useState(false);

  // Generate SVG string for live mockup preview
  const liveSvg = generateCelestialSvg(params, {
    width: 1200,
    height: 1509,
    isPrintReady: false
  });

  // Garment base color configurations
  const garmentColors: Record<
    string,
    { bg: string; shadow: string; rib: string; tag: string; border: string }
  > = {
    black: {
      bg: '#121418',
      shadow: '#0a0b0e',
      rib: '#1c1f26',
      tag: '#ffffff',
      border: 'border-white/10'
    },
    'navy blue': {
      bg: '#0c1322',
      shadow: '#060a14',
      rib: '#141d33',
      tag: '#ffffff',
      border: 'border-blue-500/20'
    },
    white: {
      bg: '#f8fafc',
      shadow: '#e2e8f0',
      rib: '#f1f5f9',
      tag: '#0f172a',
      border: 'border-white/30'
    },
    natural: {
      bg: '#f4ede1',
      shadow: '#dfd4c0',
      rib: '#ece3cf',
      tag: '#292524',
      border: 'border-amber-900/15'
    }
  };

  const currentGarment = garmentColors[params.color] || garmentColors.black;
  const isLightGarment = params.color === 'white' || params.color === 'natural';

  return (
    <div className="relative w-full aspect-[4/5] sm:aspect-square lg:aspect-[4/5] max-h-[640px] rounded-2xl bg-gradient-to-b from-[#0c0e14] via-[#10131b] to-[#0a0c12] border border-white/10 shadow-2xl overflow-hidden flex items-center justify-center p-4 select-none">
      {/* Garment Details Watermark Badge */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
        <span className="px-2.5 py-1 rounded-md text-[11px] font-mono tracking-wider uppercase bg-black/60 backdrop-blur-md border border-white/15 text-slate-300 flex items-center gap-1.5 shadow-sm">
          <Layers className="w-3 h-3 text-amber-400" />
          <span>Bella + Canvas 3001</span>
        </span>
        <span className="hidden sm:inline-block px-2 py-1 rounded-md text-[10px] font-mono tracking-wider bg-white/5 border border-white/10 text-slate-400">
          DTG 4677×5881 px
        </span>
      </div>

      {/* View Zoom Controller */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 bg-black/60 backdrop-blur-md border border-white/15 rounded-lg p-1">
        <button
          onClick={() => setIsZoomed(!isZoomed)}
          className={`flex items-center gap-1 text-xs font-mono px-2.5 py-1 rounded transition-colors ${
            isZoomed
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              : 'text-slate-300 hover:text-white hover:bg-white/10'
          }`}
          title={isZoomed ? 'Zoom Out to Full Shirt' : 'Zoom In to Chest Print'}
        >
          {isZoomed ? (
            <>
              <ZoomOut className="w-3.5 h-3.5" />
              <span>Full Garment</span>
            </>
          ) : (
            <>
              <ZoomIn className="w-3.5 h-3.5" />
              <span>Inspect Print</span>
            </>
          )}
        </button>
      </div>

      {/* Stage Studio Lighting Effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-3/4 h-3/4 bg-amber-500/5 rounded-full blur-[100px]" />
        <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-white/[0.03] to-transparent" />
      </div>

      {/* T-Shirt Mockup Container */}
      <div
        className={`relative w-full h-full flex items-center justify-center transition-transform duration-500 ease-out ${
          isZoomed ? 'scale-[1.85] translate-y-[28%]' : 'scale-100 translate-y-0'
        }`}
      >
        <div className="relative w-[340px] sm:w-[420px] md:w-[460px] aspect-[4677/5500]">
          {/* SVG Vector Realistic Bella + Canvas 3001 T-Shirt Body */}
          <svg
            viewBox="0 0 1000 1150"
            className="w-full h-full drop-shadow-[0_25px_35px_rgba(0,0,0,0.65)]"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="garmentShade" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={currentGarment.bg} />
                <stop offset="50%" stopColor={currentGarment.bg} />
                <stop offset="100%" stopColor={currentGarment.shadow} />
              </linearGradient>
              <linearGradient id="sleeveShadeLeft" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={currentGarment.shadow} stopOpacity="0.4" />
                <stop offset="100%" stopColor={currentGarment.bg} stopOpacity="0" />
              </linearGradient>
              <linearGradient id="sleeveShadeRight" x1="100%" y1="0%" x2="0%" y2="0%">
                <stop offset="0%" stopColor={currentGarment.shadow} stopOpacity="0.4" />
                <stop offset="100%" stopColor={currentGarment.bg} stopOpacity="0" />
              </linearGradient>
              <filter id="fabricTexture" x="0%" y="0%" width="100%" height="100%">
                <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="3" result="noise" />
                <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.05 0" />
                <feComposite in2="SourceGraphic" in="gl" operator="in" />
              </filter>
            </defs>

            {/* Back Neck Interior / Label */}
            <path
              d="M 400 130 C 460 165 540 165 600 130 C 580 100 420 100 400 130 Z"
              fill={currentGarment.shadow}
            />
            {/* Satin Brand Tag inside back collar */}
            <rect x="470" y="112" width="60" height="25" rx="3" fill={currentGarment.tag} opacity="0.8" />
            <text x="500" y="128" fontSize="10" fontFamily="sans-serif" fontWeight="bold" fill={isLightGarment ? '#ffffff' : '#000000'} textAnchor="middle">
              AETHEL
            </text>

            {/* Main T-Shirt Body & Sleeves Silhouette */}
            <path
              d="
                M 380 120 
                C 310 135 220 190 140 270 
                C 115 295 100 330 115 365 
                C 130 400 170 410 205 380 
                C 240 350 270 310 280 290
                L 260 980
                C 260 1010 320 1025 500 1025
                C 680 1025 740 1010 740 980
                L 720 290
                C 730 310 760 350 795 380
                C 830 410 870 400 885 365
                C 900 330 885 295 860 270
                C 780 190 690 135 620 120
                C 560 180 440 180 380 120 Z
              "
              fill="url(#garmentShade)"
              stroke={currentGarment.shadow}
              strokeWidth="2"
            />

            {/* Crew Neck Ribbed Collar Ring */}
            <path
              d="M 380 120 C 440 180 560 180 620 120 C 590 155 410 155 380 120 Z"
              fill={currentGarment.rib}
              stroke={currentGarment.shadow}
              strokeWidth="3"
            />

            {/* Left Armpit / Sleeve Seam */}
            <path
              d="M 280 290 C 265 240 275 190 320 150"
              fill="none"
              stroke={currentGarment.shadow}
              strokeWidth="2.5"
              opacity="0.6"
            />
            {/* Right Armpit / Sleeve Seam */}
            <path
              d="M 720 290 C 735 240 725 190 680 150"
              fill="none"
              stroke={currentGarment.shadow}
              strokeWidth="2.5"
              opacity="0.6"
            />

            {/* Fabric Natural Folds & Shadows */}
            <path
              d="M 280 380 Q 320 450 310 560 Q 300 680 270 780"
              fill="none"
              stroke={currentGarment.shadow}
              strokeWidth="12"
              opacity="0.25"
            />
            <path
              d="M 720 380 Q 680 450 690 560 Q 700 680 730 780"
              fill="none"
              stroke={currentGarment.shadow}
              strokeWidth="12"
              opacity="0.25"
            />
            {/* Shoulder Shading */}
            <path
              d="M 380 120 L 140 270"
              stroke={isLightGarment ? '#ffffff' : '#ffffff'}
              strokeWidth="2"
              opacity="0.1"
            />
            <path
              d="M 620 120 L 860 270"
              stroke={isLightGarment ? '#ffffff' : '#ffffff'}
              strokeWidth="2"
              opacity="0.1"
            />
          </svg>

          {/* DTG Chest Print Placement Container */}
          {/* Centered on the upper-chest area of the garment */}
          <div className="absolute top-[23%] left-[24%] w-[52%] aspect-[4677/5881] pointer-events-none flex items-center justify-center">
            {/* Inject live SVG string */}
            <div
              className="w-full h-full"
              dangerouslySetInnerHTML={{ __html: liveSvg }}
            />
          </div>
        </div>
      </div>

      {/* Bottom helper pill */}
      <div className="absolute bottom-4 inset-x-0 flex justify-center z-20 pointer-events-none">
        <span className="px-3 py-1 rounded-full text-[11px] font-mono bg-black/60 backdrop-blur-md border border-white/10 text-slate-400 flex items-center gap-1.5 shadow-lg">
          <Eye className="w-3.5 h-3.5 text-amber-400" />
          <span>Live Custom DTG Render • Exact 1-of-1 Output</span>
        </span>
      </div>
    </div>
  );
}
