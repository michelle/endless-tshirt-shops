import { SHIRTS, type ShirtKey } from '@/lib/chart';

/** A plain garment silhouette; the chart is positioned over it by CSS. */
export function Garment({ shirt }: { shirt: ShirtKey }) {
  const s = SHIRTS[shirt];
  const seam = s.dark ? 'rgba(255,255,255,0.16)' : 'rgba(22,38,63,0.18)';
  return (
    <svg className="garment" viewBox="0 0 600 660" aria-hidden="true">
      <defs>
        <linearGradient id="fold" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#000" stopOpacity="0.13" />
          <stop offset="22%" stopColor="#000" stopOpacity="0" />
          <stop offset="78%" stopColor="#000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.15" />
        </linearGradient>
      </defs>
      <path
        d="M232 44 L150 74 L58 152 Q46 164 58 178 L112 232 Q124 244 136 232 L168 200 L168 618 Q168 630 180 630 L420 630 Q432 630 432 618 L432 200 L464 232 Q476 244 488 232 L542 178 Q554 164 542 152 L450 74 L368 44 Q346 108 300 108 Q254 108 232 44 Z"
        fill={s.swatch}
        stroke={seam}
        strokeWidth="2"
      />
      <path
        d="M232 44 L150 74 L58 152 Q46 164 58 178 L112 232 Q124 244 136 232 L168 200 L168 618 Q168 630 180 630 L420 630 Q432 630 432 618 L432 200 L464 232 Q476 244 488 232 L542 178 Q554 164 542 152 L450 74 L368 44 Q346 108 300 108 Q254 108 232 44 Z"
        fill="url(#fold)"
      />
      <path
        d="M236 46 Q300 116 364 46"
        fill="none"
        stroke={seam}
        strokeWidth="2.5"
      />
      <path d="M168 210 L168 618" fill="none" stroke={seam} strokeWidth="1" opacity="0.7" />
      <path d="M432 210 L432 618" fill="none" stroke={seam} strokeWidth="1" opacity="0.7" />
    </svg>
  );
}
