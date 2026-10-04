/**
 * SafeSvg - safely inject an SVG string by stripping the XML preamble and
 * normalizing any intrinsic size so the SVG scales to fill its parent.
 *
 * Used by the homepage (sample cards) and the customize page (live preview),
 * which both need to render the same SVG at different sizes.
 */
import * as React from 'react';

export interface SafeSvgProps {
  svg: string;
  className?: string;
  preserveAspectRatio?: 'xMidYMid meet' | 'xMidYMid slice' | 'none';
}

export function SafeSvg({
  svg,
  className = '',
  preserveAspectRatio = 'xMidYMid meet',
}: SafeSvgProps) {
  // Strip XML preamble and the fixed width / height attributes so the SVG
  // scales to its container via the dominant-baseline aspect ratio.
  let html = svg.replace(/^<\?xml[^>]*\?>/, '').replace(/^\s*<svg/, '<svg');
  html = html.replace(
    /<svg([^>]*)>/,
    (_match, attrs) => {
      const cleaned = attrs
        .replace(/\swidth="[^"]*"/g, '')
        .replace(/\sheight="[^"]*"/g, '');
      const styleAttr = `style="width:100%;height:100%;display:block;"`;
      const cls = className ? ` class="${className}"` : '';
      return `<svg${cleaned} preserveAspectRatio="${preserveAspectRatio}"${cls} ${styleAttr}>`;
    }
  );
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
