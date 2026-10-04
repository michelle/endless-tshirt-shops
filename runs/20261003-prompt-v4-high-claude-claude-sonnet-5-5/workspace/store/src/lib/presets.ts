import type { Design } from "./design";

export type Preset = { slug: string; name: string; blurb: string; design: Design };

export const PRESETS: Preset[] = [
  {
    slug: "yes",
    name: "We Said Yes",
    blurb: "The sky over the vineyard at 4:30 pm, the moment the whole thing became official.",
    design: {
      title: "We said yes", date: "2023-10-14", time: "16:30", caption: "Sam & Priya", shirt: "black", ink: "gilt", lines: true,
      place: { name: "Napa", cc: "US", lat: 38.298, lon: -122.286, tz: "America/Los_Angeles" },
    },
  },
  {
    slug: "met",
    name: "The Night We Met",
    blurb: "A Lisbon rooftop in June. Every star that was watching, in the right place.",
    design: {
      title: "The night we met", date: "2019-06-14", time: "21:42", caption: "Mia & Jonas", shirt: "white", ink: "midnight", lines: true,
      place: { name: "Lisbon", cc: "PT", lat: 38.725, lon: -9.15, tz: "Europe/Lisbon" },
    },
  },
  {
    slug: "dayone",
    name: "Day One",
    blurb: "The sky they were born under. A gift for new parents, or for yourself.",
    design: {
      title: "Day one", date: "2024-03-09", time: "07:12", caption: "Welcome, Ava", shirt: "dhg", ink: "ice", lines: true,
      place: { name: "Chicago", cc: "US", lat: 41.85, lon: -87.65, tz: "America/Chicago" },
    },
  },
  {
    slug: "liftoff",
    name: "Liftoff",
    blurb: "Apollo 11 leaves Earth, 9:32 am, July 16, 1969. Yes, the Sun is up. We show it anyway.",
    design: {
      title: "Liftoff", date: "1969-07-16", time: "09:32", caption: "One small step", shirt: "military", ink: "moonlight", lines: true,
      place: { name: "Cape Canaveral", cc: "US", lat: 28.396, lon: -80.605, tz: "America/New_York" },
    },
  },
];

export const DEFAULT_DESIGN: Design = PRESETS[1].design;
