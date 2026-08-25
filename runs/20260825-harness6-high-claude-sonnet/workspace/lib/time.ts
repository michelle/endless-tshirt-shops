export type Frozen = { date: string; time: string; tz: string };

const pad = (n: number, len = 2) => n.toString().padStart(len, "0");

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** Formats "now" the way it's printed on the shirt: date, time-with-ms, tz. */
export function formatNow(d: Date): Frozen {
  const date = `${WEEKDAYS[d.getDay()]} ${MONTHS[d.getMonth()]} ${pad(d.getDate())} ${d.getFullYear()}`;
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
  let tz = "UTC";
  try {
    tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    // ignore — fall back to UTC
  }
  return { date, time, tz };
}
