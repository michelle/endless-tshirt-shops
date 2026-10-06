// Converts raw GeoJSON downloads (data/raw) into compact JSON files used at runtime.
// Source: https://github.com/dieghernan/celestial_data (BSD-3-Clause, derived from
// d3-celestial by Olaf Frohn). See data/LICENSE-data.txt.
const fs = require('fs');
const path = require('path');

const RAW = path.join(__dirname, '..', 'data', 'raw');
const OUT = path.join(__dirname, '..', 'data');

function load(name) {
  return JSON.parse(fs.readFileSync(path.join(RAW, name), 'utf8'));
}

const norm360 = (x) => ((x % 360) + 360) % 360;

// --- Stars ---------------------------------------------------------------
const stars = load('stars.6.min.geojson').features.map((f) => {
  const [ra, dec] = f.geometry.coordinates;
  const p = f.properties;
  // [raDeg, decDeg, mag, bv, name|null]
  return [norm360(ra), dec, p.mag, p.bv ?? null, p.name ?? null];
});
stars.sort((a, b) => a[2] - b[2]); // brightest first
fs.writeFileSync(path.join(OUT, 'stars.json'), JSON.stringify(stars));
console.log(`stars.json: ${stars.length} stars, ${stars.filter((s) => s[4]).length} named`);

// --- Constellation lines --------------------------------------------------
const lines = load('constellations.lines.min.geojson').features.map((f) => ({
  id: f.properties.id,
  name: f.properties.name,
  rank: f.properties.rank,
  segs: f.geometry.coordinates.map((line) => line.map(([ra, dec]) => [norm360(ra), dec])),
}));
fs.writeFileSync(path.join(OUT, 'constellation-lines.json'), JSON.stringify(lines));
console.log(`constellation-lines.json: ${lines.length} constellations`);

// --- Milky Way contours ---------------------------------------------------
// Five brightness levels ol1 (outermost/faintest) .. ol5 (galactic core).
// Downsample every 2nd point; contours are far denser than needed for art.
const mw = load('mw.min.geojson').features
  .sort((a, b) => (a.properties.id < b.properties.id ? -1 : 1))
  .map((f) => ({
    id: f.properties.id,
    polys: f.geometry.coordinates.map((poly) =>
      poly.map((ring) =>
        ring
          .filter((_, i) => i % 2 === 0 || i === ring.length - 1)
          .map(([ra, dec]) => [norm360(ra), dec])
      )
    ),
  }));
fs.writeFileSync(path.join(OUT, 'milkyway.json'), JSON.stringify(mw));
console.log(`milkyway.json: ${mw.length} levels`);

// --- Data attribution ------------------------------------------------------
fs.writeFileSync(
  path.join(OUT, 'LICENSE-data.txt'),
  `Astronomical data in this directory is derived from:

  dieghernan/celestial_data - https://github.com/dieghernan/celestial_data
  Copyright (c) 2023, dieghernan. BSD-3-Clause License.

  Which in turn is derived from:

  Frohn, Olaf. 2015. "d3-celestial." https://github.com/ofrohn/d3-celestial/
  Copyright (c) 2015, Olaf Frohn. BSD-3-Clause License.

  Star names/designations: Kostjuk, N. D. 2002, VizieR Online Data Catalog IV/27A.
  Constellation lines/names: IAU Constellation page, modifications by Olaf Frohn.
  Milky Way contours: Olaf Frohn, 2015, d3-celestial.

BSD 3-Clause License

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this
   list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.

3. Neither the name of the copyright holder nor the names of its contributors
   may be used to endorse or promote products derived from this software
   without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
`
);
console.log('LICENSE-data.txt written');
