import sharpModule from 'sharp';

const sharp: any = sharpModule;

export default async function handler(req: any, res: any) {
  try {
    const query = req.query || {};
    const safe = (value: string, max: number) => String(value || '').replace(/[<>&"']/g, '').slice(0, max);
    const name = safe(query.name || 'your word', 22);
    const phrase = safe(query.phrase || 'stay curious', 42).toUpperCase();
    const badge = safe(query.badge || 'orbit', 12);
    const symbols: Record<string, string> = { orbit: '◌', spark: '✦', moon: '◐', wave: '∿' };
    const symbol = symbols[badge] || symbols.orbit;
    const words = phrase.split(/\s+/).filter(Boolean).slice(0, 6);
    const svg = `<svg width="2400" height="3000" viewBox="0 0 2400 3000" xmlns="http://www.w3.org/2000/svg"><g fill="#f5e5cd" text-anchor="middle" font-family="Arial, Helvetica, sans-serif"><text x="1200" y="360" font-size="74" letter-spacing="18" opacity=".85">MIY / 01</text><text x="1200" y="720" font-size="${Math.max(120, 320 - words.join(' ').length * 3)}" font-weight="800" letter-spacing="-5">${words.map((word, i) => `<tspan x="1200" dy="${i === 0 ? 0 : 270}">${word}</tspan>`).join('')}</text><rect x="820" y="${780 + words.length * 270}" width="760" height="12" fill="#e66f55"/><text x="850" y="${900 + words.length * 270}" text-anchor="start" font-size="64" letter-spacing="9">${name.toUpperCase()}</text><text x="1550" y="${900 + words.length * 270}" text-anchor="end" font-size="150" fill="#e66f55">${symbol}</text></g></svg>`;
    const png = await sharp(Buffer.from(svg)).png().toBuffer();
    res.setHeader('Content-Type', 'image/png'); res.setHeader('Cache-Control', 'public, max-age=31536000, immutable'); return res.status(200).send(png);
  } catch (error) { console.error('print_art_error', error); return res.status(500).send('Could not render print art'); }
}
