// Pure, dependency-free design parameter helpers. Safe to import from both
// server and client code (unlike lib/design.ts, which pulls in the native
// canvas renderer).

export interface DesignParams {
  title: string;
  date: string; // YYYY-MM-DD
  place?: string;
  ink: 'light' | 'dark';
}

export const WIDTH = 3000;
export const HEIGHT = 4000;

export function encodeDesignParams(params: DesignParams): string {
  return Buffer.from(JSON.stringify(params)).toString('base64url');
}

export function decodeDesignParams(d: string): DesignParams {
  const parsed = JSON.parse(Buffer.from(d, 'base64url').toString('utf8'));
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Invalid design params');
  }
  return parsed as DesignParams;
}
