import { ImageResponse } from '@vercel/og';

export function formatArtworkLines(timestampMs: number): { date: string; time: string } {
  const d = new Date(timestampMs);
  const date = d.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
  const time =
    d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'UTC',
    }) + `.${String(d.getUTCMilliseconds()).padStart(3, '0')} UTC`;
  return { date, time };
}

// Renders the exact moment of purchase as print-ready artwork (white on
// transparent, sized for an 8in-wide DTG print) so the shirt is stamped with
// the instant the customer checked out.
export async function generateArtworkPng(timestampMs: number): Promise<Buffer> {
  const { date, time } = formatArtworkLines(timestampMs);

  const image = new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent',
        }}
      >
        <div style={{ color: 'white', fontSize: 70, fontWeight: 700, letterSpacing: -1 }}>{date}</div>
        <div style={{ color: 'white', fontSize: 56, fontWeight: 400, marginTop: 12 }}>{time}</div>
      </div>
    ),
    { width: 1600, height: 480 },
  );

  const arrayBuffer = await (image as unknown as Response).arrayBuffer();
  return Buffer.from(arrayBuffer);
}
