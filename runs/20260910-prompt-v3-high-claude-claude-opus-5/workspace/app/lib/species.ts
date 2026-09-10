// Turns three plain-English answers (a name, a date, a place) into a complete,
// reproducible botanical specification: taxonomy, morphology and label copy.

import { hashString, makeRng, type Rng } from './rng';

export type Inputs = {
  name: string;
  date: string; // YYYY-MM-DD
  place: string;
  paletteId: string; // '' or 'auto' => derived from the seed
};

export const LEAF_FORMS = [
  'ovate', 'lanceolate', 'cordate', 'palmate', 'pinnate',
  'linear', 'orbicular', 'sagittate', 'spatulate',
] as const;
export type LeafForm = (typeof LEAF_FORMS)[number];

export const MARGINS = ['entire', 'serrate', 'dentate', 'crenate', 'lobed', 'undulate'] as const;
export type Margin = (typeof MARGINS)[number];

export const FLOWER_FORMS = ['rayed', 'stellate', 'campanulate', 'rosette', 'tubular', 'papilionaceous'] as const;
export type FlowerForm = (typeof FLOWER_FORMS)[number];

export const INFLORESCENCES = ['solitary', 'umbel', 'raceme', 'panicle', 'cyme', 'spike'] as const;
export type Inflorescence = (typeof INFLORESCENCES)[number];

export const ROOTS = ['taproot', 'fibrous', 'rhizome', 'bulb', 'tuber'] as const;
export type Root = (typeof ROOTS)[number];

export const HABITS = ['erect', 'arching', 'climbing', 'rosette', 'shrubby'] as const;
export type Habit = (typeof HABITS)[number];

export const FRUITS = ['berry', 'capsule', 'legume', 'samara', 'achene'] as const;
export type Fruit = (typeof FRUITS)[number];

export type Morphology = {
  habit: Habit;
  height: number;          // 0..1, relative stature
  branchOrders: number;    // 2..4
  branchAngle: number;     // degrees
  internodes: number;      // nodes on the main axis
  curvature: number;       // -1..1
  leafForm: LeafForm;
  leafArrangement: 'alternate' | 'opposite' | 'whorled';
  margin: Margin;
  leafLength: number;      // 0..1
  leafSlenderness: number; // 0..1
  venation: number;        // secondary vein pairs
  flowerForm: FlowerForm;
  petals: number;
  inflorescence: Inflorescence;
  flowerSize: number;      // 0..1
  buds: number;
  root: Root;
  fruit: Fruit;
  hairiness: number;       // 0..1, stipple density
  gloss: number;           // 0..1, highlight strength
};

export type Taxon = {
  genus: string;
  epithet: string;
  variety: string;
  authority: string;
  family: string;
  common: string;
  accession: string;
  plate: string;
  dateLong: string;
  collector: string;
  locality: string;
  habitatNote: string;
  floweringNote: string;
};

export type Specimen = {
  inputs: Inputs;
  seed: number;
  paletteId: string;
  taxon: Taxon;
  morph: Morphology;
};

/* ------------------------------------------------------------------ words */

const MONTH_EPITHETS = [
  'hiemalis', 'brumalis', 'vernalis', 'praecox', 'floribunda', 'aestivalis',
  'solaris', 'meridiana', 'serotina', 'autumnalis', 'nebulosa', 'nivalis',
];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const VARIETIES = [
  'nocturna', 'lucida', 'stellata', 'radiata', 'mirabilis', 'insignis',
  'gloriosa', 'venusta', 'candida', 'purpurascens', 'argentea', 'aurea',
  'tenella', 'robusta', 'errans', 'vagans', 'umbrosa', 'nitida',
  'speciosa', 'fragilis', 'tenax', 'perennis', 'sonora', 'borealis',
  'australis', 'rupestris', 'maritima', 'sylvatica', 'pallida', 'coronata',
];
const FAMILIES = [
  'Personaliaceae', 'Memoriaceae', 'Cordataceae', 'Nominaceae',
  'Diariaceae', 'Vitaeaceae', 'Anniversariaceae', 'Domesticaceae',
];
const COMMON_HEADS = [
  'Bell', 'Star', 'Crown', 'Lantern', 'Thimble', 'Comet', 'Ember',
  'Feather', 'Candle', 'Bramble', 'Wick', 'Halo', 'Trumpet', 'Cup',
];
const COMMON_MODS = [
  'Night', 'Morning', 'Winter', 'Summer', 'Wander', 'Hearth', 'Tide',
  'Dusk', 'Hollow', 'River', 'Field', 'Spire', 'Salt', 'Lark', 'Ash',
];
const COMMON_ADJ = [
  'Lesser', 'Greater', 'Common', 'True', 'Wild', 'Dwarf', 'Creeping',
  'Nodding', 'Sweet', 'Dusky', 'Bright', 'Late',
];
const HABITATS = [
  'roadside verges and disturbed ground',
  'damp shade beneath old walls',
  'south-facing walls and warm brick',
  'the margins of standing water',
  'open grassland; self-seeding',
  'cracked pavement and kerbstone',
  'hedgerow and field boundary',
  'thin soil over stone; drought-hardy',
  'coastal shingle and salt spray',
  'windowsills, semi-domesticated',
];

/* ------------------------------------------------------------- latinising */

const VOWELS = 'aeiouy';

export function latinise(raw: string): string {
  const cleaned = raw.toLowerCase().replace(/[^a-z]/g, '');
  if (cleaned.length < 2) return 'Anonyma';
  let base = cleaned;
  if (VOWELS.includes(base[base.length - 1]) && base.length > 2) {
    base = base.slice(0, -1);
  }
  const last = base[base.length - 1];
  let out: string;
  if (last === 'i') out = base + 'a';
  else if (last === 'r') out = base + 'ia';
  else out = base + 'ia';
  return out[0].toUpperCase() + out.slice(1);
}

function authorityFrom(parts: string[]): string {
  if (parts.length > 1) {
    const surname = parts[parts.length - 1].replace(/[^A-Za-z'-]/g, '');
    if (surname.length > 1) {
      return surname[0].toUpperCase() + surname.slice(1).toLowerCase() + '.';
    }
  }
  const first = (parts[0] || 'anon').replace(/[^A-Za-z]/g, '');
  return (first[0] || 'A').toUpperCase() + '.';
}

const MINOR_WORDS = new Set(['de', 'del', 'la', 'le', 'les', 'du', 'da', 'di', 'van', 'von', 'of', 'the', 'upon', 'am', 'an', 'sur', 'sobre', 'el']);

function titleCase(s: string): string {
  // Respect the capitalisation people typed; only fix all-lower-case input.
  return s
    .split(/\s+/)
    .filter(Boolean)
    .map((w, i) => {
      if (/[A-Z]/.test(w)) return w;
      if (i > 0 && MINOR_WORDS.has(w.toLowerCase())) return w.toLowerCase();
      return w[0].toUpperCase() + w.slice(1);
    })
    .join(' ');
}

function roman(n: number): string {
  const table: [number, string][] = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
    [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ];
  let out = '';
  let v = Math.max(1, n);
  for (const [num, sym] of table) {
    while (v >= num) { out += sym; v -= num; }
  }
  return out;
}

function parseDate(iso: string): { y: number; m: number; d: number; valid: boolean } {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!m) return { y: 1899, m: 5, d: 1, valid: false };
  const y = Number(m[1]);
  const mo = Math.min(12, Math.max(1, Number(m[2])));
  const d = Math.min(31, Math.max(1, Number(m[3])));
  return { y, m: mo, d, valid: true };
}

/* --------------------------------------------------------------- assembly */

function morphology(rng: Rng, month: number, day: number): Morphology {
  // Month nudges the plant towards a plausible seasonal form; the seed does
  // the rest, so two people born in the same month still look nothing alike.
  const wintery = month === 12 || month <= 2;
  const habit = rng.pick(HABITS);
  const leafForm = rng.pick(LEAF_FORMS);
  const flowerForm = rng.pick(FLOWER_FORMS);
  const petalChoices = flowerForm === 'rayed' ? [8, 13, 21, 34] :
    flowerForm === 'rosette' ? [8, 13, 21] :
    flowerForm === 'papilionaceous' ? [5] :
    flowerForm === 'campanulate' ? [5, 6] : [3, 5, 6, 8];
  return {
    habit,
    height: rng.range(0.55, 1),
    branchOrders: habit === 'rosette' ? 2 : rng.int(2, 4),
    branchAngle: rng.range(16, 42),
    internodes: rng.int(3, 7),
    curvature: rng.gauss() * 0.6,
    leafForm,
    leafArrangement: rng.pick(['alternate', 'opposite', 'whorled'] as const),
    margin: rng.pick(MARGINS),
    leafLength: rng.range(0.45, 1),
    leafSlenderness: rng.range(0.25, 0.95),
    venation: rng.int(3, 8),
    flowerForm,
    petals: rng.pick(petalChoices),
    inflorescence: rng.pick(INFLORESCENCES),
    flowerSize: rng.range(0.4, 1),
    buds: rng.int(1, 4),
    root: wintery ? rng.pick(['bulb', 'tuber', 'rhizome'] as const) : rng.pick(ROOTS),
    fruit: rng.pick(FRUITS),
    hairiness: rng.range(0, 1),
    gloss: rng.range(0.1, 0.9),
    // day is folded into the seed upstream; kept here so the signature is honest
    ...(day ? {} : {}),
  };
}

export function buildSpecimen(inputs: Inputs): Specimen {
  const name = (inputs.name || '').trim().replace(/\s+/g, ' ').slice(0, 44) || 'Anonymous';
  const place = (inputs.place || '').trim().replace(/\s+/g, ' ').slice(0, 44) || 'Unrecorded';
  const { y, m, d } = parseDate(inputs.date);

  const seed = hashString(`${name.toLowerCase()}|${inputs.date}|${place.toLowerCase()}`);
  const rng = makeRng(seed);

  const parts = name.split(' ');
  const genus = latinise(parts[0]);
  const epithet = MONTH_EPITHETS[m - 1];
  const variety = VARIETIES[(seed >>> 7) % VARIETIES.length];
  const authority = authorityFrom(parts);
  const family = FAMILIES[(seed >>> 13) % FAMILIES.length];

  const morph = morphology(rng, m, d);

  const city = titleCase(place.split(',')[0].trim() || place);
  const commonHead = rng.pick(COMMON_HEADS);
  const commonMod = rng.pick(COMMON_MODS);
  const common = rng.chance(0.5)
    ? `${rng.pick(COMMON_ADJ)} ${city} ${commonHead}`
    : `${city} ${commonMod}${commonHead.toLowerCase()}`;

  const accession = `FP-${(seed % 0xffff).toString(16).toUpperCase().padStart(4, '0')}-${String(m).padStart(2, '0')}${String(d).padStart(2, '0')}`;
  const plate = roman(((seed >>> 3) % 320) + 1);

  const paletteId = inputs.paletteId && inputs.paletteId !== 'auto'
    ? inputs.paletteId
    : ['herbarium', 'cyanotype', 'nocturne', 'foxglove', 'ochre', 'verdigris', 'monochrome', 'coral'][(seed >>> 17) % 8];

  return {
    inputs: { name, date: inputs.date, place, paletteId: inputs.paletteId },
    seed,
    paletteId,
    taxon: {
      genus,
      epithet,
      variety,
      authority,
      family,
      common,
      accession,
      plate,
      dateLong: `${d} ${MONTH_NAMES[m - 1]} ${y}`,
      collector: name,
      locality: place,
      habitatNote: HABITATS[(seed >>> 11) % HABITATS.length],
      floweringNote: `Fl. ${MONTH_NAMES[m - 1].slice(0, 3)}.–${MONTH_NAMES[(m + rng.int(1, 3)) % 12].slice(0, 3)}.`,
    },
    morph,
  };
}
