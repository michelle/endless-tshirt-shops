// Prints base64url design ids for sample specs.
// Usage: node scripts/designid.mjs

import { validateSpec, encodeSpec } from '../lib/spec.js'

const samples = {
  'born-berlin': {
    t: 'born', d: '1994-05-12', tm: '21:30',
    p: 'Berlin, Germany', la: 52.52, lo: 13.405, tz: 'Europe/Berlin',
    dg: 'for Emma, my whole sky', c: 'black', s: 'm', q: 1,
  },
  'met-paris': {
    t: 'met', d: '2019-10-19', tm: '23:45',
    p: 'Paris, France', la: 48.8566, lo: 2.3522, tz: 'Europe/Paris',
    dg: '', c: 'navy blue', s: 'l', q: 1,
  },
  'moon-landing': {
    t: 'custom', ti: 'The Night We Walked on the Moon',
    d: '1969-07-20', tm: '20:17',
    p: 'Tranquility Base, The Moon', la: 0.674, lo: 23.473, tz: 'UTC',
    dg: 'one small step', c: 'black', s: 'm', q: 1,
  },
  'born-brooklyn': {
    t: 'born', d: '1990-06-30', tm: '02:15',
    p: 'Brooklyn, New York, United States', la: 40.65, lo: -73.95, tz: 'America/New_York',
    dg: 'welcome to the world, Leo', c: 'asphalt', s: 'l', q: 1,
  },
}

for (const [name, raw] of Object.entries(samples)) {
  const spec = validateSpec(raw)
  if (!spec) {
    console.error(`${name}: INVALID SPEC`)
    continue
  }
  console.log(`${name}: ${encodeSpec(spec)}`)
}
