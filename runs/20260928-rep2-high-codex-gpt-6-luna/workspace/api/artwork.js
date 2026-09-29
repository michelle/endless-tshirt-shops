function xml(value) { return String(value || '').replace(/[<>&"']/g, (c) => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c])); }
function seedOf(s) { let h = 2166136261; for (const ch of s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function randomizer(seed) { return () => { seed += 0x6D2B79F5; let t=seed; t=Math.imul(t^t>>>15,t|1); t^=t+Math.imul(t^t>>>7,t|61); return ((t^t>>>14)>>>0)/4294967296; }; }
function coords(value, axis) { const n = Math.max(axis === 'lat' ? -90 : -180, Math.min(axis === 'lat' ? 90 : 180, Number(value) || 0)); return `${Math.abs(n).toFixed(4)}° ${n >= 0 ? axis === 'lat' ? 'N' : 'E' : axis === 'lat' ? 'S' : 'W'}`; }
module.exports = async (req, res) => {
  const q = req.query || {};
  const words = String(q.words || 'a moment worth keeping').slice(0,32);
  const place = String(q.place || 'somewhere').slice(0,36);
  const date = String(q.date || '2000-01-01').slice(0,10);
  const lat = Number(q.lat) || 0, lon = Number(q.lon) || 0;
  const rand = randomizer(seedOf(`${words}|${date}|${lat.toFixed(4)}|${lon.toFixed(4)}`));
  const stars = Array.from({length:11}, () => ({x:330+rand()*540,y:430+rand()*570,r:8+rand()*10}));
  const lines = stars.slice(1).map((p,i)=>`<path d="M${stars[i].x.toFixed(1)} ${stars[i].y.toFixed(1)}L${p.x.toFixed(1)} ${p.y.toFixed(1)}"/>`).join('');
  const dots = stars.map(p=>`<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${p.r.toFixed(1)}"/>`).join('');
  const safeWords = xml(words.toUpperCase()), safePlace = xml(place.toUpperCase());
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="4680" height="5790" viewBox="0 0 1200 1484"><g transform="translate(270 346) scale(.55)"><g fill="none" stroke="#d4c99e" stroke-opacity=".20"><circle cx="600" cy="720" r="520" stroke-width="3"/><circle cx="600" cy="720" r="585" stroke-width="2" stroke-dasharray="5 22"/></g><g font-family="Arial,sans-serif" fill="#f4e8be" text-anchor="middle"><text x="600" y="328" font-size="27" letter-spacing="8">A SKY OF YOUR OWN</text><text x="600" y="1165" font-size="31" letter-spacing="5">${safeWords}</text><text x="600" y="1224" font-size="25" letter-spacing="5" fill="#d4c99e">${safePlace}</text><text x="600" y="1284" font-size="22" letter-spacing="4" fill="#d4c99e">${xml(coords(lat,'lat'))}  ·  ${xml(coords(lon,'lon'))}</text><text x="600" y="1348" font-size="20" letter-spacing="6" fill="#d4c99e">${xml(date)}</text></g><g stroke="#d4c99e" stroke-opacity=".65" fill="none" stroke-width="5">${lines}</g><g fill="#f4e8be">${dots}</g><g stroke="#d4c99e" stroke-opacity=".65" stroke-width="4"><path d="M600 150v60m0 1020v60M45 720h60m1050 0h60"/></g><circle cx="600" cy="720" r="10" fill="#f4e8be"/></g></svg>`;
  try {
    const sharp = require('sharp');
    const png = await sharp(Buffer.from(svg)).png().toBuffer();
    res.setHeader('Content-Type','image/png');
    res.setHeader('Cache-Control','public, max-age=60, s-maxage=300');
    res.status(200).send(png);
  } catch (error) {
    console.error('Artwork rendering failed',error.message);
    res.status(500).send('Artwork rendering failed');
  }
};
