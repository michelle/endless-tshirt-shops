'use client';

import React from 'react';
import { X, Check } from 'lucide-react';
import { ShirtSize } from '@/lib/types';

interface SizeGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedSize: ShirtSize;
  onSelectSize: (size: ShirtSize) => void;
}

export function SizeGuideModal({
  isOpen,
  onClose,
  selectedSize,
  onSelectSize
}: SizeGuideModalProps) {
  if (!isOpen) return null;

  const sizeChart: {
    size: ShirtSize;
    name: string;
    chestInches: string;
    chestCm: string;
    lengthInches: string;
    lengthCm: string;
  }[] = [
    { size: 'xs', name: 'Extra Small', chestInches: '31 - 34"', chestCm: '78 - 86 cm', lengthInches: '27"', lengthCm: '68 cm' },
    { size: 's', name: 'Small', chestInches: '34 - 37"', chestCm: '86 - 94 cm', lengthInches: '28"', lengthCm: '71 cm' },
    { size: 'm', name: 'Medium', chestInches: '38 - 41"', chestCm: '96 - 104 cm', lengthInches: '29"', lengthCm: '74 cm' },
    { size: 'l', name: 'Large', chestInches: '42 - 45"', chestCm: '106 - 114 cm', lengthInches: '30"', lengthCm: '76 cm' },
    { size: 'xl', name: 'Extra Large', chestInches: '46 - 49"', chestCm: '116 - 124 cm', lengthInches: '31"', lengthCm: '79 cm' },
    { size: '2xl', name: 'Double Extra Large', chestInches: '50 - 53"', chestCm: '127 - 135 cm', lengthInches: '32"', lengthCm: '81 cm' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#0f131c] border border-white/15 rounded-2xl shadow-2xl p-6 sm:p-8 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <h3 className="font-serif-luxury text-xl font-bold text-white tracking-wider">
              BELLA + CANVAS 3001 SIZE GUIDE
            </h3>
            <p className="text-xs text-slate-400 font-mono mt-1">
              Unisex Retail Fit • 4.2 oz 100% Combed Ringspun Cotton • Pre-shrunk
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Fit Description */}
        <div className="my-5 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200/90 text-xs leading-relaxed">
          <strong>Fit Recommendation:</strong> Fits true to size with a tailored, modern unisex retail cut. If you prefer a relaxed or streetwear oversized drape, we recommend ordering one size up.
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-white/10 text-slate-400 uppercase tracking-wider">
                <th className="py-2.5 px-3">Size</th>
                <th className="py-2.5 px-3">Chest (Inches)</th>
                <th className="py-2.5 px-3">Chest (Metric)</th>
                <th className="py-2.5 px-3">Length</th>
                <th className="py-2.5 px-3 text-right">Select</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {sizeChart.map((row) => {
                const isSelected = selectedSize === row.size;
                return (
                  <tr
                    key={row.size}
                    onClick={() => onSelectSize(row.size)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-amber-500/15 text-amber-200'
                        : 'hover:bg-white/5 text-slate-300'
                    }`}
                  >
                    <td className="py-3 px-3 font-bold uppercase flex items-center gap-2">
                      <span className="w-6 h-6 rounded bg-white/10 flex items-center justify-center text-xs">
                        {row.size.toUpperCase()}
                      </span>
                      <span className="text-slate-400 font-normal hidden sm:inline">
                        {row.name}
                      </span>
                    </td>
                    <td className="py-3 px-3">{row.chestInches}</td>
                    <td className="py-3 px-3 text-slate-400">{row.chestCm}</td>
                    <td className="py-3 px-3">{row.lengthInches} ({row.lengthCm})</td>
                    <td className="py-3 px-3 text-right">
                      {isSelected ? (
                        <span className="inline-flex items-center gap-1 text-amber-400 font-bold">
                          <Check className="w-4 h-4" /> Active
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300"
                        >
                          Choose
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs tracking-wider uppercase transition-colors"
          >
            Apply & Close
          </button>
        </div>
      </div>
    </div>
  );
}
