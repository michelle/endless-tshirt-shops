const CONTROL = /[\u0000-\u001f\u007f<>]/g;
const clean = (s, max) => String(s ?? '').replace(CONTROL, '').replace(/\s+/g, ' ').trim().slice(0, max);

const NO_POSTCODE = new Set(['AE', 'AG', 'AO', 'AW', 'BS', 'BZ', 'BJ', 'BF', 'BI', 'CD', 'CF', 'CG', 'CK', 'DJ', 'DM', 'ER', 'FJ', 'GD', 'GH', 'GM', 'GQ', 'GY', 'HK', 'KI', 'KM', 'KN', 'LY', 'ML', 'MO', 'MR', 'MW', 'NR', 'NU', 'QA', 'RW', 'SB', 'SC', 'SL', 'SO', 'SR', 'ST', 'SY', 'TL', 'TK', 'TO', 'TV', 'UG', 'VU', 'YE', 'ZW']);
const STATE_REQUIRED = new Set(['US', 'CA', 'AU', 'BR', 'IN', 'MX']);
const POSTCODE = {
  US: /^\d{5}(-\d{4})?$/,
  CA: /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/,
  GB: /^[A-Za-z]{1,2}\d[A-Za-z\d]?\s?\d[A-Za-z]{2}$/,
  AU: /^\d{4}$/,
  DE: /^\d{5}$/,
  FR: /^\d{5}$/,
  ES: /^\d{5}$/,
  IT: /^\d{5}$/,
  NL: /^\d{4}\s?[A-Za-z]{2}$/,
};

export function normalizeRecipient(raw, shippable) {
  const errors = {};
  const country = String(raw?.country || '').toUpperCase();
  const out = {
    name: clean(raw?.name, 100),
    line1: clean(raw?.line1, 100),
    line2: clean(raw?.line2, 100),
    city: clean(raw?.city, 60),
    state: clean(raw?.state, 40),
    postalCode: clean(raw?.postalCode, 12).toUpperCase(),
    phone: clean(raw?.phone, 25),
    country,
  };
  if (!shippable.includes(country)) errors.country = "We can't ship to that country yet.";
  if (!out.name) errors.name = 'Enter the recipient name.';
  if (!out.line1) errors.line1 = 'Enter a street address.';
  if (!out.city) errors.city = 'Enter a city.';
  if (STATE_REQUIRED.has(country) && !out.state) errors.state = 'Enter a state / province.';
  if (!NO_POSTCODE.has(country)) {
    if (!out.postalCode) errors.postalCode = 'Enter a postal code.';
    else if (POSTCODE[country] && !POSTCODE[country].test(out.postalCode)) errors.postalCode = 'That postal code looks wrong for this country.';
  }
  return Object.keys(errors).length ? { errors } : { recipient: out };
}

export const isEmail = (s) => typeof s === 'string' && s.length <= 254 && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]{2,}$/.test(s);
