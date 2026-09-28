'use client';

import { designElements, FONT_CSS } from '@/lib/design';
import type { StyleId } from '@/lib/catalog';
import { PRINT_HEIGHT, PRINT_WIDTH } from '@/lib/print-const';

// Client-side preview renderer: same layout spec as the print renderer,
// but emitted as real SVG <text> so it stays crisp at any zoom.
export default function DesignSvg({
  text,
  style,
  inkHex,
}: {
  text: string;
  style: StyleId;
  inkHex: string;
}) {
  const elements = designElements({ text, style, width: PRINT_WIDTH, height: PRINT_HEIGHT });
  return (
    <>
      {elements.map((el, i) => {
        if (el.kind === 'text') {
          return (
            <text
              key={i}
              x={el.x}
              y={el.y}
              fontFamily={FONT_CSS[el.font]}
              fontSize={el.size}
              fill={inkHex}
              fillOpacity={el.opacity}
              textAnchor="middle"
              letterSpacing={el.letterSpacing ?? 0}
              transform={el.rotate ? `rotate(${el.rotate} ${el.x} ${el.y})` : undefined}
            >
              {el.text}
            </text>
          );
        }
        if (el.kind === 'rect') {
          return (
            <rect
              key={i}
              x={el.x}
              y={el.y}
              width={el.w}
              height={el.h}
              fill={inkHex}
              fillOpacity={el.opacity}
            />
          );
        }
        return (
          <circle key={i} cx={el.cx} cy={el.cy} r={el.r} fill={inkHex} fillOpacity={el.opacity} />
        );
      })}
    </>
  );
}
