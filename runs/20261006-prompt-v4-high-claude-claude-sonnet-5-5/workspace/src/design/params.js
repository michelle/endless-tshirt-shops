'use strict';
const { canPrint } = require('./text');

const PALETTES = ['starlight', 'gilt', 'aurora', 'rose'];
const MONTHS = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];

class ValidationError extends Error {
  constructor(message, field) { super(message); this.name = 'ValidationError'; this.field = field; this.status = 400; }
}

function clean(value, field, max, { required = false, label } = {}) {
  let s = typeof value === 'string' ? value.normalize('NFC').replace(/\s+/g, ' ').trim() : '';
  if (!s) {
    if (required) throw new ValidationError(`Please enter ${label || field}.`, field);
    return '';
  }
  if ([...s].length > max) throw new ValidationError(`${label || field} can be at most ${max} characters.`, field);
  if (/[\u0000-\u001f<>]/.test(s)) throw new ValidationError(`${label || field} contains characters we can't print.`, field);
  if (!canPrint(s)) throw new ValidationError(`${label || field} contains a character our print fonts don't support yet. Please use Latin letters, numbers and basic punctuation.`, field);
  return s;
}

function normalizeDesign(input = {}) {
  const name = clean(input.name, 'name', 24, { required: true, label: 'a name' });
  if (!/\p{L}/u.test(name)) throw new ValidationError('A name needs at least one letter.', 'name');
  if (!/^[\p{L}\p{M} '’.\-]+$/u.test(name)) throw new ValidationError('Names can contain letters, spaces, hyphens and apostrophes.', 'name');

  let date = '';
  if (input.date) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(input.date));
    if (!m) throw new ValidationError('Please use a valid date.', 'date');
    const [y, mo, d] = [+m[1], +m[2], +m[3]];
    const t = new Date(Date.UTC(y, mo - 1, d));
    if (y < 1800 || y > 2100 || t.getUTCMonth() !== mo - 1 || t.getUTCDate() !== d) throw new ValidationError('Please use a valid date.', 'date');
    date = `${m[1]}-${m[2]}-${m[3]}`;
  }

  const place = clean(input.place, 'place', 30, { label: 'Place' });
  const message = clean(input.message, 'message', 36, { label: 'Message' });
  const variant = Math.max(0, Math.min(99, parseInt(input.variant, 10) || 0));
  const palette = PALETTES.includes(input.palette) ? input.palette : 'starlight';
  const labels = input.labels === true || input.labels === 'true' || input.labels === '1' || input.labels === 1;
  return { name, date, place, message, variant, palette, labels };
}

function prettyDate(date) {
  if (!date) return '';
  const [y, m, d] = date.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

module.exports = { normalizeDesign, prettyDate, ValidationError, PALETTES };
