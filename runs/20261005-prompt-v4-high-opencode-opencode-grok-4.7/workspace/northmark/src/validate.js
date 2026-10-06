import { colorById, sizeById, COUNTRIES, US_STATES } from "./catalog.js";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

function clean(value, max) {
  return String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

export function validateDesign(input) {
  const title = clean(input.title, 42);
  const place = clean(input.place, 48);
  const dedication = clean(input.dedication, 80);
  const date = clean(input.date, 10);
  const time = clean(input.time, 5);
  const timezone = clean(input.timezone, 64);
  const color = clean(input.color, 32);
  const size = clean(input.size, 8);
  const lat = Number(input.lat);
  const lon = Number(input.lon);
  const copies = Math.round(Number(input.copies || 1));

  if (!title) fail("Give the plate a title.");
  if (!place) fail("Choose a city so the sky can be set.");
  if (!DATE.test(date)) fail("Choose a date.");
  if (!TIME.test(time)) fail("Choose a time.");
  if (!timezone || !timezone.includes("/")) fail("Pick a city from the list so we know the timezone.");
  if (!Number.isFinite(lat) || lat < -85 || lat > 85) fail("That latitude cannot be charted.");
  if (!Number.isFinite(lon) || lon < -180 || lon > 180) fail("That longitude cannot be charted.");
  if (!colorById(color)) fail("Choose a shirt color.");
  if (!sizeById(size)) fail("Choose a size.");
  if (!Number.isFinite(copies) || copies < 1 || copies > 4) fail("Quantity must be 1 to 4.");

  return {
    title,
    place,
    dedication,
    date,
    time,
    timezone,
    lat: Math.round(lat * 10000) / 10000,
    lon: Math.round(lon * 10000) / 10000,
    color,
    size,
    copies,
  };
}

export function validateShipping(input) {
  const shipName = clean(input.shipName, 60);
  const email = clean(input.email, 80);
  const phone = clean(input.phone, 24);
  const line1 = clean(input.line1, 80);
  const line2 = clean(input.line2, 80);
  const city = clean(input.city, 48);
  const region = clean(input.region, 40);
  const postal = clean(input.postal, 16);
  const country = clean(input.country, 2).toUpperCase();

  if (shipName.length < 2) fail("Add the recipient's name.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail("Add a valid email.");
  if (phone.length < 6) fail("Add a phone number for the courier.");
  if (line1.length < 3) fail("Add a street address.");
  if (city.length < 2) fail("Add a city.");
  if (!postal) fail("Add a postal code.");
  if (!COUNTRIES.some(([code]) => code === country)) fail("We don't ship that shirt color to that country yet.");
  if (country === "US" && !US_STATES.includes(region)) fail("Choose a US state.");

  return { shipName, email, phone, line1, line2, city, region, postal, country };
}

export function specFromMetadata(metadata) {
  const design = validateDesign(metadata);
  const shipping = validateShipping(metadata);
  return {
    ...design,
    ...shipping,
    method: metadata.method || "Standard",
    shippingCents: Number(metadata.shippingCents || 0),
  };
}

function fail(message) {
  const err = new Error(message);
  err.status = 400;
  throw err;
}
