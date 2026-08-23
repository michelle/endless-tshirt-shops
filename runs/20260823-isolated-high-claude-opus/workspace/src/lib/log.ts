/** Structured single-line logs, so Vercel's log drain stays greppable. */
type Fields = Record<string, unknown>;

function emit(level: 'info' | 'warn' | 'error', event: string, fields: Fields = {}) {
  const line = { level, event, ...fields };
  const out = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  out(JSON.stringify(line));
}

export const log = {
  info: (event: string, fields?: Fields) => emit('info', event, fields),
  warn: (event: string, fields?: Fields) => emit('warn', event, fields),
  error: (event: string, fields?: Fields) => emit('error', event, fields),
};

/** Never let a customer address or card detail reach the logs. */
export function redactAddressForLog(address: { city: string; state: string; zip: string }) {
  return { city: address.city, state: address.state, zip: address.zip };
}
