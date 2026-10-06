const { renderPng } = require('../api/_lib/design');
const fs = require('fs');
(async () => {
  const specs = {
    dark: { c:'The night we said yes', n:'Maya & Leo', d:'2021-06-14', t:'21:30', la:38.72, lo:-9.14, p:'Lisbon, Portugal', k:'dark', o:60 },
    light: { c:'Welcome to the world, June', n:'June Amelia', d:'2024-03-02', t:'04:12', la:40.71, lo:-74.01, p:'New York, USA', k:'light', o:-300 },
    winter: { c:'Orion check', n:'', d:'2024-01-15', t:'21:00', la:40.0, lo:-74.0, p:'New York', k:'dark', o:-300 },
  };
  for (const [name, spec] of Object.entries(specs)) {
    const png = await renderPng(spec, 900);
    fs.writeFileSync(`/tmp/pv-${name}.png`, png);
    console.log(name, png.length);
  }
})().catch(e => { console.error(e); process.exit(1); });
