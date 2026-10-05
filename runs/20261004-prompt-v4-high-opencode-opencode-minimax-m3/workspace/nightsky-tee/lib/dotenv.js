// Reads a `.env` from the project root and merges into process.env
// for any keys not already set there. Tiny dependency-free parser
// so we don't have to install dotenv.

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const dotenvPath = path.resolve(here, "..", ".env");

if (existsSync(dotenvPath)) {
  const txt = readFileSync(dotenvPath, "utf8");
  for (const line of txt.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const m = trimmed.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/i);
    if (!m) continue;
    const key = m[1];
    let val = m[2].trim();
    // strip surrounding quotes
    if ((val.startsWith('"') && val.endsWith('"'))
     || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) {
      process.env[key] = val;
    }
  }
}
