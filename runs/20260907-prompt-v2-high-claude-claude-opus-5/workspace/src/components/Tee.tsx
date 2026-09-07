import { artPath, getColor } from '@/lib/catalog';

/**
 * Flat-lay outline of a Gildan 64000, size L, drawn to scale in a 620x620 box:
 * ~16.5px per inch — 30" body length, ~20" chest, ~30" across the sleeves.
 */
const BODY = `M254,56
C264,84 280,96 310,96 C340,96 356,84 366,56
L454,68 C496,80 540,110 562,146
L524,220 C518,232 506,234 496,226
L476,196 L490,548 C490,556 484,562 476,562
L144,562 C136,562 130,556 130,548
L144,196 L124,226 C114,234 102,232 96,220
L58,146 C80,110 124,80 166,68 Z`;

const COLLAR = 'M246,50 C256,90 278,108 310,108 C342,108 364,90 374,50';

export default function Tee({
  slug,
  colorId,
  back = false,
  className,
}: {
  slug: string;
  colorId: string;
  back?: boolean;
  className?: string;
}) {
  const c = getColor(colorId) ?? getColor('black')!;
  const uid = `${slug}-${colorId}-${back ? 'b' : 'f'}`.replace(/[^a-z0-9-]/gi, '');

  return (
    <svg viewBox="0 0 620 620" className={className} role="img"
         aria-label={`${slug} tee, ${c.name}, ${back ? 'back' : 'front'}`}
         style={{ width: '100%', height: 'auto', display: 'block' }}>
      <defs>
        <clipPath id={`clip-${uid}`}><path d={BODY} /></clipPath>
        <linearGradient id={`sh-${uid}`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#000" stopOpacity="0.17" />
          <stop offset="0.2" stopColor="#000" stopOpacity="0.02" />
          <stop offset="0.46" stopColor="#fff" stopOpacity="0.06" />
          <stop offset="0.8" stopColor="#000" stopOpacity="0.02" />
          <stop offset="1" stopColor="#000" stopOpacity="0.17" />
        </linearGradient>
        <linearGradient id={`sh2-${uid}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.08" />
          <stop offset="0.5" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.11" />
        </linearGradient>
      </defs>

      <path d={BODY} fill={c.hex} />

      <g clipPath={`url(#clip-${uid})`}>
        <rect x="0" y="0" width="620" height="620" fill={`url(#sh-${uid})`} />
        <rect x="0" y="0" width="620" height="620" fill={`url(#sh2-${uid})`} />
        <g stroke="#000" strokeOpacity="0.06" fill="none" strokeWidth="8" strokeLinecap="round">
          <path d="M198,230 C190,330 192,450 198,548" />
          <path d="M422,230 C430,330 428,450 422,548" />
          <path d="M310,470 C300,500 300,530 306,556" />
        </g>
        {/* armhole seams */}
        <g stroke={c.seam} strokeOpacity="0.55" fill="none" strokeWidth="3">
          <path d="M166,68 C152,110 146,152 144,196" />
          <path d="M454,68 C468,110 474,152 476,196" />
        </g>
      </g>

      {!back ? (
        <image href={artPath(slug, c.id)} x="211" y="140" width="198" height="220"
               preserveAspectRatio="xMidYMid meet" />
      ) : (
        <image href={artPath(slug, c.id)} x="272" y="128" width="76" height="84"
               preserveAspectRatio="xMidYMid meet" />
      )}

      <path d={BODY} fill="none" stroke={c.seam} strokeWidth="2.5" strokeLinejoin="round" />
      <path d={COLLAR} fill="none" stroke={c.seam} strokeWidth="7" strokeLinecap="round" />
      <g stroke={c.seam} strokeWidth="2.2" strokeOpacity="0.75" fill="none">
        <path d="M132,540 H488" />
        <path d="M108,204 L136,182" />
        <path d="M512,204 L484,182" />
      </g>
    </svg>
  );
}
