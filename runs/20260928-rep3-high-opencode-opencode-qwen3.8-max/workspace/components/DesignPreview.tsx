'use client';

// Re-renders the ordered design in the browser for the order-status page.
import { useMemo } from 'react';
import { renderDesignForShirt } from '@/lib/design';
import { shirtColor, type DesignParams } from '@/lib/types';

export default function DesignPreview({
  design,
  color,
}: {
  design: DesignParams;
  color: string;
}) {
  const svg = useMemo(() => {
    try {
      return renderDesignForShirt(design, color);
    } catch {
      return null;
    }
  }, [design, color]);

  if (!svg) return <p>Design could not be rendered.</p>;
  const c = shirtColor(color);
  return (
    <div
      className="design-preview"
      style={{ background: c.hex }}
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
