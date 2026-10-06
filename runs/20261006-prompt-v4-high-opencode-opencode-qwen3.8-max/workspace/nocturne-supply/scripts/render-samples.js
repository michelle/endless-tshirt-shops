// Renders sample designs to SVG + PNG for visual review.
// Usage: node scripts/render-samples.js
const fs = require('fs');
const path = require('path');
const { buildSVG, renderPNG, skyFacts } = require('../lib/design');
const { resolveMoment, formatCoords } = require('../lib/moment');

const OUT = path.join(__dirname, '..', 'samples');
fs.mkdirSync(OUT, { recursive: true });

const cases = [
  {
    name: 'paris-birth',
    date: '2001-03-14', time: '21:42', lat: 48.8566, lon: 2.3522,
    headline: 'THE NIGHT YOU WERE BORN', dedication: 'FOR EMMA',
    place: 'PARIS, FRANCE', shirtColor: 'black',
  },
  {
    name: 'nyc-wedding',
    date: '2019-09-21', time: '22:15', lat: 40.7128, lon: -74.006,
    headline: 'THE NIGHT WE SAID YES', dedication: 'ANA & JAMES',
    place: 'NEW YORK, NY', shirtColor: 'navy blue',
  },
  {
    name: 'sydney-summer',
    date: '1989-01-26', time: '22:30', lat: -33.8688, lon: 151.2093,
    headline: 'UNDER SOUTHERN SKIES', dedication: null,
    place: 'SYDNEY, AUSTRALIA', shirtColor: 'white',
  },
  {
    name: 'reykjavik-aurora',
    date: '2015-02-28', time: '23:00', lat: 64.1466, lon: -21.9426,
    headline: 'THE NIGHT THE SKY DANCED', dedication: null,
    place: 'REYKJAVÍK, ICELAND', shirtColor: 'dark heather grey',
  },
  {
    name: 'tokyo-daylight-edge',
    date: '2022-07-07', time: '19:50', lat: 35.6762, lon: 139.6503,
    headline: 'TANABATA, THE NIGHT WE MET', dedication: null,
    place: 'TOKYO, JAPAN', shirtColor: 'burgundy',
  },
];

for (const c of cases) {
  const m = resolveMoment(c.date, c.time, c.lat, c.lon);
  const spec = {
    utcDate: m.utcDate,
    lat: c.lat,
    lon: c.lon,
    headline: c.headline,
    dedication: c.dedication,
    subline: `${m.dateLong.toUpperCase()} · ${m.time12.toUpperCase()} · ${c.place}`,
    coordsLine: formatCoords(c.lat, c.lon),
    shirtColor: c.shirtColor,
  };
  const svg = buildSVG(spec, { size: 4000 });
  fs.writeFileSync(path.join(OUT, `${c.name}.svg`), svg);
  const t0 = Date.now();
  const png = renderPNG(svg, 4000);
  fs.writeFileSync(path.join(OUT, `${c.name}.png`), png);
  const facts = skyFacts(spec);
  fs.writeFileSync(path.join(OUT, `${c.name}.json`), JSON.stringify({ ...spec, utcDate: m.utcDate.toISOString(), facts }, null, 2));
  console.log(
    `${c.name}: svg ${(svg.length / 1024).toFixed(0)}KB, png ${(png.length / 1024).toFixed(0)}KB in ${Date.now() - t0}ms | ` +
    `daylight=${facts.daylight} sunAlt=${facts.sunAltitude.toFixed(1)}° moon=${facts.moon.name}(${(facts.moon.fraction * 100).toFixed(0)}%,up=${facts.moon.aboveHorizon}) ` +
    `constellations=[${facts.constellations.join(', ')}] planets=[${facts.planetsUp.map((p) => p.name).join(',')}] brightest=${facts.brightestStar?.name}`
  );
}
console.log('\nsamples written to', OUT);
