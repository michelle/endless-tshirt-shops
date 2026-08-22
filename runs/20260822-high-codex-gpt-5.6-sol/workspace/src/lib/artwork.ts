import sharp from "sharp";

export async function createTimestampArtwork(timestamp: string) {
  const safeTimestamp = timestamp.replace(/[^0-9]/g, "").slice(0, 19);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="2400" height="900" viewBox="0 0 2400 900">
      <rect width="2400" height="900" fill="transparent"/>
      <text x="1200" y="435" text-anchor="middle" fill="#F7F2E9"
        font-family="DejaVu Sans Mono, Liberation Mono, monospace" font-size="245" font-weight="700"
        letter-spacing="5">${safeTimestamp}</text>
      <text x="1200" y="595" text-anchor="middle" fill="#F7F2E9"
        font-family="DejaVu Sans Mono, Liberation Mono, monospace" font-size="76" font-weight="500"
        letter-spacing="24">THIS EXACT MOMENT</text>
    </svg>`;
  return sharp(Buffer.from(svg)).png({ compressionLevel: 9, palette: true }).toBuffer();
}
