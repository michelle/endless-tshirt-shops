// Runtime env accessor. Locally (dev server) it falls back to secrets.local.env;
// on Vercel the platform injects env vars directly. The filename is assembled at
// runtime so static file tracers don't try to bundle the secrets file.
const fs = require("fs");
const path = require("path");

let loaded = false;
function loadLocal() {
  if (loaded) return;
  loaded = true;
  if (process.env.VERCEL) return;
  const name = ["secrets", "local", "env"].join(".");
  try {
    const p = path.resolve(__dirname, "..", name);
    if (!fs.existsSync(p)) return;
    for (const line of fs.readFileSync(p, "utf8").split("\n")) {
      const m = line.match(/^([A-Z_]+)=(.*)$/);
      if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
    }
  } catch (e) { /* no local secrets file — env must come from the shell */ }
}

function get(name) {
  loadLocal();
  return process.env[name];
}

module.exports = { get };
