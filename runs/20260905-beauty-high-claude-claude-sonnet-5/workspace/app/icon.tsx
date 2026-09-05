import { ImageResponse } from 'next/og';

export const size = { width: 64, height: 64 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 40,
          background: 'linear-gradient(135deg, #ff8fc7, #c6a9ff)',
          borderRadius: 16,
        }}
      >
        ⏳
      </div>
    ),
    { ...size }
  );
}
