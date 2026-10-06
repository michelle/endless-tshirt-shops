// Catalog loader: stars, constellation lines, Milky Way contours.
const fs = require('fs');
const path = require('path');

const DATA = path.join(__dirname, '..', 'data');

let cache = null;

function loadCatalog() {
  if (cache) return cache;
  cache = {
    // [raDeg, decDeg, mag, bv, name]
    stars: JSON.parse(fs.readFileSync(path.join(DATA, 'stars.json'), 'utf8')),
    // {id, name, rank, segs:[[[ra,dec],...]]}
    lines: JSON.parse(fs.readFileSync(path.join(DATA, 'constellation-lines.json'), 'utf8')),
    // {id, polys:[[[[ra,dec],...]]]}  ol1 faintest .. ol5 core
    milkyway: JSON.parse(fs.readFileSync(path.join(DATA, 'milkyway.json'), 'utf8')),
  };
  return cache;
}

module.exports = { loadCatalog };
