import { createHmac, timingSafeEqual } from 'node:crypto';

export type Design = {
  firstName: string;
  secondName: string;
  place: string;
  date: string;
  size: string;
};

const allowedSizes = new Set(['s', 'm', 'l', 'xl', '2xl']);

function clean(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/[<>]/g, '').replace(/\s+/g, ' ').slice(0, maxLength);
}

export function validateDesign(input: unknown): Design {
  const source = input && typeof input === 'object' ? input as Record<string, unknown> : {};
  const design: Design = {
    firstName: clean(source.firstName, 14),
    secondName: clean(source.secondName, 14),
    place: clean(source.place, 28),
    date: clean(source.date, 10),
    size: clean(source.size, 4).toLowerCase(),
  };
  if (!design.firstName || !design.secondName || !design.place || !/^\d{4}-\d{2}-\d{2}$/.test(design.date) || !allowedSizes.has(design.size)) {
    throw new Error('Please complete every field with a valid date and size.');
  }
  return design;
}

export function sealDesign(design: Design, secret: string) {
  const payload = Buffer.from(JSON.stringify(design)).toString('base64url');
  const signature = createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

export function openDesign(token: string, secret: string): Design {
  const [payload, supplied] = token.split('.');
  if (!payload || !supplied) throw new Error('Invalid artwork token.');
  const expected = createHmac('sha256', secret).update(payload).digest();
  const actual = Buffer.from(supplied, 'base64url');
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new Error('Invalid artwork token.');
  return validateDesign(JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')));
}

export function publicOrigin(requestOrigin?: string) {
  const configured = process.env.SITE_URL?.replace(/\/$/, '');
  if (configured) return configured;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (requestOrigin && /^https?:\/\/[a-z0-9.-]+(?::\d+)?$/i.test(requestOrigin)) return requestOrigin;
  return 'http://localhost:3000';
}
