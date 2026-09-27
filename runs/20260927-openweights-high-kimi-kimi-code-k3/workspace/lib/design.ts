export interface DesignParams {
  caption: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  place: string;
  lat: number;
  lon: number;
  size: string;
  color: string;
}

export const SIZES = ["xs", "s", "m", "l", "xl", "2xl", "3xl", "4xl"] as const;

export const COLORS: { value: string; label: string; dark: boolean }[] = [
  { value: "black", label: "Black", dark: true },
  { value: "navy blue", label: "Navy", dark: true },
  { value: "white", label: "White", dark: false },
  { value: "natural", label: "Natural", dark: false },
  { value: "athletic grey heather", label: "Heather Grey", dark: false },
];

export const PRICE_CENTS = 3890; // $38.90, free shipping

export function isDarkShirt(color: string): boolean {
  const c = COLORS.find((c) => c.value === color);
  return c ? c.dark : true;
}

export function validateDesign(input: any): DesignParams | string {
  const caption = String(input.caption ?? "").trim().slice(0, 48);
  const place = String(input.place ?? "").trim().slice(0, 48);
  const date = String(input.date ?? "");
  const time = String(input.time ?? "21:00");
  const lat = Number(input.lat);
  const lon = Number(input.lon);
  const size = String(input.size ?? "").toLowerCase();
  const color = String(input.color ?? "").toLowerCase();

  if (!caption) return "A title for your moment is required.";
  if (!place) return "A place is required.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || isNaN(Date.parse(date + "T00:00:00Z")))
    return "A valid date is required.";
  if (!/^\d{2}:\d{2}$/.test(time)) return "A valid time is required.";
  if (!isFinite(lat) || lat < -66 || lat > 66)
    return "Latitude must be between -66 and 66.";
  if (!isFinite(lon) || lon < -180 || lon > 180)
    return "Longitude must be between -180 and 180.";
  if (!(SIZES as readonly string[]).includes(size)) return "Invalid size.";
  if (!COLORS.some((c) => c.value === color)) return "Invalid color.";

  return { caption, date, time, place, lat, lon, size, color };
}
