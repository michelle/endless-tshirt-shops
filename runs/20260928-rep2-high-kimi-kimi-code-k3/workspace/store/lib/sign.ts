import crypto from 'crypto';

export function canonical(text: string, style: string, ink: string): string {
  return `${text}|${style}|${ink}`;
}

export function sign(text: string, style: string, ink: string): string {
  return crypto
    .createHmac('sha256', process.env.SIGNING_SECRET!)
    .update(canonical(text, style, ink))
    .digest('hex');
}

export function verifySignature(text: string, style: string, ink: string, sig: string): boolean {
  if (!/^[0-9a-f]{64}$/.test(sig)) return false;
  const expected = Buffer.from(sign(text, style, ink), 'hex');
  const given = Buffer.from(sig, 'hex');
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
}
