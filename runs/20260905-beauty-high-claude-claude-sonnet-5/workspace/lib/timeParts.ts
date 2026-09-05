import type { ClockFormat } from './catalog';

export type TimeParts = {
  hour: string;
  minute: string;
  second: string;
  ms: string;
  dayPeriod: string; // '' when 24h
  weekday: string;
  month: string;
  day: string;
  year: string;
  hourNum: number; // 0-23, used for theme color decisions
};

export function getTimeParts(date: Date, timeZone: string, format: ClockFormat): TimeParts {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: format === '12h',
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const parts = dtf.formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? '';

  // Hour-in-timezone as a number, used purely to pick theme colors (sun
  // position, day/night palettes) — derive it from a 24h formatter so it is
  // independent of the user's 12h/24h display preference.
  const hour24Parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    hour12: false,
  }).formatToParts(date);
  const hourNum = Number(hour24Parts.find((p) => p.type === 'hour')?.value ?? '0') % 24;

  return {
    hour: get('hour').padStart(format === '24h' ? 2 : 1, '0'),
    minute: get('minute'),
    second: get('second'),
    ms: String(date.getMilliseconds()).padStart(3, '0'),
    dayPeriod: format === '12h' ? get('dayPeriod') : '',
    weekday: get('weekday'),
    month: get('month'),
    day: get('day'),
    year: get('year'),
    hourNum,
  };
}
