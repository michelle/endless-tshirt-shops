export function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing configuration: ${name}`);
  return value;
}
export function appUrl() {
  const url = new URL(required('APP_URL'));
  if (url.protocol !== 'https:' && url.hostname !== 'localhost')
    throw new Error('Invalid APP_URL');
  return url.origin;
}
export function isSandbox() {
  return process.env.PRODIGI_ENVIRONMENT !== 'live';
}
export function assertPaymentMode(livemode: boolean) {
  if (livemode === isSandbox())
    throw new Error('Payment and fulfillment environments do not match');
  if (livemode && process.env.ENABLE_LIVE_ORDERS !== 'true')
    throw new Error('Live orders are disabled');
}
export function checkOrigin(request: Request) {
  const origin = request.headers.get('origin');
  const allowed = [appUrl()];
  if (process.env.NODE_ENV === 'development')
    allowed.push('http://localhost:3000');
  if (!origin || !allowed.includes(origin))
    throw new Error('Invalid request origin');
}
export async function readJson(request: Request) {
  if (!request.headers.get('content-type')?.includes('application/json'))
    throw new Error('Expected JSON');
  if (Number(request.headers.get('content-length') || 0) > 4096)
    throw new Error('Request too large');
  const body = await request.text();
  if (body.length > 4096) throw new Error('Request too large');
  return JSON.parse(body);
}
