import { describe, expect, it } from 'vitest';
import { checkoutRequestSchema, decodeArtwork, MAX_ARTWORK_BYTES } from '@/lib/schema';

const PNG_HEADER = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const tinyPng = 'data:image/png;base64,' + Buffer.concat([PNG_HEADER, Buffer.alloc(32)]).toString('base64');

const valid = {
  email: 'jenny@example.com',
  address: {
    name: 'Jenny Rosen',
    address1: '185 Berry St',
    address2: 'Suite 550',
    city: 'San Francisco',
    state: 'ca',
    zip: '94107',
    country: 'US' as const,
  },
  style: 'fitted' as const,
  size: 'M' as const,
  timestamp: 1787455804123,
  artwork: tinyPng,
};

describe('checkoutRequestSchema', () => {
  it('accepts a well-formed order and upper-cases the state', () => {
    const parsed = checkoutRequestSchema.parse(valid);
    expect(parsed.address.state).toBe('CA');
    expect(parsed.address.country).toBe('US');
  });

  it('defaults address2 to an empty string when omitted', () => {
    const { address2: _omitted, ...address } = valid.address;
    const parsed = checkoutRequestSchema.parse({ ...valid, address: address });
    expect(parsed.address.address2).toBe('');
  });

  it.each([
    ['a bad email', { email: 'not-an-email' }],
    ['an unknown style', { style: 'crop-top' }],
    ['an unknown size', { size: 'XXXXL' }],
    ['a non-PNG artwork payload', { artwork: 'data:image/jpeg;base64,abcd' }],
    ['a negative timestamp', { timestamp: -1 }],
    ['a non-integer timestamp', { timestamp: 1.5 }],
  ])('rejects %s', (_label, patch) => {
    expect(checkoutRequestSchema.safeParse({ ...valid, ...patch }).success).toBe(false);
  });

  it.each([
    ['a 4-digit zip', '9410'],
    ['a letter in the zip', '9410A'],
    ['a UK postcode', 'SW1A 1AA'],
  ])('rejects %s', (_label, zip) => {
    const result = checkoutRequestSchema.safeParse({
      ...valid,
      address: { ...valid.address, zip },
    });
    expect(result.success).toBe(false);
  });

  it('accepts a ZIP+4', () => {
    const result = checkoutRequestSchema.safeParse({
      ...valid,
      address: { ...valid.address, zip: '94107-1234' },
    });
    expect(result.success).toBe(true);
  });

  it('rejects a non-US country, since we only quote US shipping', () => {
    const result = checkoutRequestSchema.safeParse({
      ...valid,
      address: { ...valid.address, country: 'CA' },
    });
    expect(result.success).toBe(false);
  });
});

describe('decodeArtwork', () => {
  it('decodes a PNG data URL', () => {
    expect(decodeArtwork(tinyPng).subarray(0, 8)).toEqual(PNG_HEADER);
  });

  it('rejects a payload whose bytes are not a PNG', () => {
    const jpegBytes = 'data:image/png;base64,' + Buffer.from([0xff, 0xd8, 0xff, 0xe0]).toString('base64');
    expect(() => decodeArtwork(jpegBytes)).toThrow(/not a PNG/);
  });

  it('rejects an empty payload', () => {
    expect(() => decodeArtwork('data:image/png;base64,')).toThrow(/empty/);
  });

  it('rejects artwork over the size ceiling', () => {
    const huge =
      'data:image/png;base64,' +
      Buffer.concat([PNG_HEADER, Buffer.alloc(MAX_ARTWORK_BYTES + 1)]).toString('base64');
    expect(() => decodeArtwork(huge)).toThrow(/too large/);
  });
});
