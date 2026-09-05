import { ImageResponse } from 'next/og';
import { SHIRT_PATHS } from '@/lib/shirt-path';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

/** Favicon: the shirt, in miniature. */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#ffffff',
        }}
      >
        <svg width={30} height={30} viewBox="0 0 100 102">
          <path d={SHIRT_PATHS.unisex} fill="#111111" fillRule="evenodd" clipRule="evenodd" />
        </svg>
      </div>
    ),
    size,
  );
}
