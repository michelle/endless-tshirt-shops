export const TIMEZONES: { value: string; label: string }[] = [
  { value: 'local', label: '📍 Your local time' },
  { value: 'UTC', label: '🌐 UTC' },
  { value: 'America/New_York', label: '🗽 New York' },
  { value: 'America/Los_Angeles', label: '🌴 Los Angeles' },
  { value: 'America/Chicago', label: '🌭 Chicago' },
  { value: 'Europe/London', label: '☕ London' },
  { value: 'Europe/Paris', label: '🥐 Paris' },
  { value: 'Asia/Tokyo', label: '🍣 Tokyo' },
  { value: 'Asia/Kolkata', label: '🕌 Mumbai' },
  { value: 'Asia/Shanghai', label: '🐉 Shanghai' },
  { value: 'Australia/Sydney', label: '🏄 Sydney' },
  { value: 'Pacific/Auckland', label: '🥝 Auckland' },
];

export function resolveTimeZone(value: string): string {
  if (value !== 'local') return value;
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}
