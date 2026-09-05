/**
 * A moment can be written down in more than one way. These are the ways we
 * offer to write yours down.
 *
 * Everything here is pure and deterministic: given the same millisecond and the
 * same timezone, the browser preview and the 300dpi print file compose the
 * exact same artwork. That is the entire trick — there is one composition
 * function, and both renderers read from it.
 */

export type DialectId = "epoch" | "iso" | "longhand" | "beats" | "binary";

export type Dialect = {
  id: DialectId;
  /** Tab label. */
  name: string;
  /** One line of sales talk. */
  blurb: string;
};

export const DIALECTS: Record<DialectId, Dialect> = {
  epoch: {
    id: "epoch",
    name: "Epoch",
    blurb: "The number every computer secretly agrees on.",
  },
  iso: {
    id: "iso",
    name: "ISO 8601",
    blurb: "The moment, filed correctly, by the book.",
  },
  longhand: {
    id: "longhand",
    name: "Longhand",
    blurb: "The way you'd say it out loud to a friend.",
  },
  beats: {
    id: "beats",
    name: "Beats",
    blurb: "1000 beats a day, no timezones. A 1998 idea that deserved better.",
  },
  binary: {
    id: "binary",
    name: "Binary",
    blurb: "Thirty-two bits. Everything the machine actually keeps.",
  },
};

export const DIALECT_IDS = Object.keys(DIALECTS) as DialectId[];

export function isDialect(v: unknown): v is DialectId {
  return typeof v === "string" && v in DIALECTS;
}

/* -------------------------------------------------------------------------- */
/* The design space                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Blocks are laid out in a 1000-unit-wide, centre-aligned column. Sizes,
 * tracking and gaps are all in those units. Scale the column to a chest on
 * screen or to 4500px of print area and you get the same picture.
 */
export const DESIGN_WIDTH = 1000;

export type PrintFont = "mono" | "monoBold" | "serifItalic";

export type Block =
  | {
      kind: "text";
      text: string;
      font: PrintFont;
      /** Cap-ish type size in design units. */
      size: number;
      /** Extra space between characters, as a fraction of size. */
      tracking: number;
      /** Space above this block, in design units. */
      gap: number;
      /** 0–1, applied to the ink colour. */
      opacity: number;
    }
  | { kind: "rule"; width: number; gap: number; opacity: number };

export type Composition = { blocks: Block[] };

const WORDMARK: Block = {
  kind: "text",
  text: "DATETIME.STORE",
  font: "mono",
  size: 30,
  tracking: 0.42,
  gap: 0,
  opacity: 0.55,
};

const RULE: Block = { kind: "rule", width: 320, gap: 54, opacity: 0.35 };

function caption(text: string): Block {
  return { kind: "text", text, font: "mono", size: 24, tracking: 0.3, gap: 26, opacity: 0.6 };
}

/* -------------------------------------------------------------------------- */
/* Formatting helpers                                                          */
/* -------------------------------------------------------------------------- */

function parts(ms: number, timeZone: string) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  const out: Record<string, string> = {};
  for (const p of fmt.formatToParts(new Date(ms))) out[p.type] = p.value;
  return out;
}

/** e.g. "Pacific Daylight Time" — the human name of the zone at that instant. */
export function zoneName(ms: number, timeZone: string) {
  try {
    const fmt = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "long" });
    const p = fmt.formatToParts(new Date(ms)).find((x) => x.type === "timeZoneName");
    return p?.value ?? timeZone;
  } catch {
    return timeZone;
  }
}

/** Swatch Internet Time: 1000 beats per day, counted from midnight in Biel. */
export function beats(ms: number) {
  const bielMs = ms + 3600_000; // UTC+1, all year round, forever.
  const dayMs = ((bielMs % 86_400_000) + 86_400_000) % 86_400_000;
  return (dayMs / 86_400) ;
}

export function safeTimeZone(tz: string | undefined | null): string {
  if (!tz) return "UTC";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return tz;
  } catch {
    return "UTC";
  }
}

/* -------------------------------------------------------------------------- */
/* The composition                                                             */
/* -------------------------------------------------------------------------- */

export function compose(dialect: DialectId, ms: number, timeZone: string): Composition {
  const tz = safeTimeZone(timeZone);
  const blocks: Block[] = [WORDMARK];

  switch (dialect) {
    case "epoch": {
      blocks.push({
        kind: "text",
        text: String(Math.trunc(ms)),
        font: "monoBold",
        size: 112,
        tracking: 0.02,
        gap: 62,
        opacity: 1,
      });
      blocks.push(RULE, caption("MILLISECONDS SINCE 1970"));
      break;
    }

    case "iso": {
      const d = new Date(ms);
      const iso = d.toISOString();
      blocks.push({
        kind: "text",
        text: iso.slice(0, 10),
        font: "monoBold",
        size: 132,
        tracking: 0.02,
        gap: 60,
        opacity: 1,
      });
      blocks.push({
        kind: "text",
        text: iso.slice(11, 23) + "Z",
        font: "monoBold",
        size: 96,
        tracking: 0.02,
        gap: 22,
        opacity: 0.92,
      });
      blocks.push(RULE, caption("ISO 8601 / UTC"));
      break;
    }

    case "longhand": {
      const p = parts(ms, tz);
      blocks.push({
        kind: "text",
        text: p.weekday ?? "",
        font: "serifItalic",
        size: 150,
        tracking: 0,
        gap: 56,
        opacity: 1,
      });
      blocks.push({
        kind: "text",
        text: `${p.day} ${p.month} ${p.year}`,
        font: "serifItalic",
        size: 96,
        tracking: 0,
        gap: 14,
        opacity: 0.95,
      });
      blocks.push({
        kind: "text",
        text: `${p.hour}:${p.minute}:${p.second} ${(p.dayPeriod ?? "").toLowerCase()}`,
        font: "mono",
        size: 52,
        tracking: 0.1,
        gap: 34,
        opacity: 0.85,
      });
      blocks.push(RULE, caption(zoneName(ms, tz).toUpperCase()));
      break;
    }

    case "beats": {
      blocks.push({
        kind: "text",
        text: "@" + beats(ms).toFixed(2),
        font: "monoBold",
        size: 190,
        tracking: 0.01,
        gap: 66,
        opacity: 1,
      });
      blocks.push(RULE, caption("SWATCH INTERNET TIME"));
      break;
    }

    case "binary": {
      const secs = Math.floor(ms / 1000);
      const bits = secs.toString(2).padStart(32, "0");
      for (let i = 0; i < 4; i++) {
        blocks.push({
          kind: "text",
          text: bits.slice(i * 8, i * 8 + 8).split("").join(" "),
          font: "monoBold",
          size: 92,
          tracking: 0.06,
          gap: i === 0 ? 58 : 16,
          opacity: 1,
        });
      }
      blocks.push(RULE, caption("UNIX SECONDS, BASE TWO"));
      break;
    }
  }

  blocks.push({
    kind: "text",
    text: "ONE OF ONE / NEVER AGAIN",
    font: "mono",
    size: 22,
    tracking: 0.34,
    gap: 22,
    opacity: 0.45,
  });

  return { blocks };
}

/** A short, one-line version of the moment, for receipts and page titles. */
export function summarize(dialect: DialectId, ms: number, timeZone: string) {
  const tz = safeTimeZone(timeZone);
  switch (dialect) {
    case "epoch":
      return String(Math.trunc(ms));
    case "iso":
      return new Date(ms).toISOString();
    case "beats":
      return "@" + beats(ms).toFixed(2);
    case "binary":
      return Math.floor(ms / 1000).toString(2).padStart(32, "0");
    case "longhand": {
      const p = parts(ms, tz);
      return `${p.weekday}, ${p.day} ${p.month} ${p.year} at ${p.hour}:${p.minute}:${p.second} ${(p.dayPeriod ?? "").toLowerCase()}`;
    }
  }
}
