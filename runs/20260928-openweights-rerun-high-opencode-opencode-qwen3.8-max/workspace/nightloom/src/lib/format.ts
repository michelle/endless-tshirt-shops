const MONTHS = [
  'JANUARY',
  'FEBRUARY',
  'MARCH',
  'APRIL',
  'MAY',
  'JUNE',
  'JULY',
  'AUGUST',
  'SEPTEMBER',
  'OCTOBER',
  'NOVEMBER',
  'DECEMBER',
];

/** "1993-03-14" -> "14 MARCH 1993" */
export function formatDateLong(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return dateStr.toUpperCase();
  return `${d} ${MONTHS[(m || 1) - 1]} ${y}`;
}

/** (40.7128, -74.006) -> "40.71° N, 74.01° W" */
export function formatCoords(lat: number, lng: number): string {
  const la = `${Math.abs(lat).toFixed(2)}° ${lat >= 0 ? 'N' : 'S'}`;
  const lo = `${Math.abs(lng).toFixed(2)}° ${lng >= 0 ? 'E' : 'W'}`;
  return `${la}, ${lo}`;
}

/** Money helper: cents -> "34.00" */
export function centsToStr(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function formatUSD(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
