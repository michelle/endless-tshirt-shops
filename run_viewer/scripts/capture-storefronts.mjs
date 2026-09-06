import { access, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright";

export const viewport = { width: 1440, height: 900 };
const projectRoot = fileURLToPath(new URL("../", import.meta.url));

async function readJson(file, fallback) {
  try { return JSON.parse(await readFile(file, "utf8")); }
  catch (error) { if (error.code === "ENOENT") return fallback; throw error; }
}

async function saveJson(file, value) {
  await writeFile(`${file}.tmp`, `${JSON.stringify(value, null, 2)}\n`);
  await rename(`${file}.tmp`, file);
}

export function artifactDirectory(root, suite, run) {
  if (!/^[a-zA-Z0-9_-]+$/.test(suite.id)) throw new Error("Invalid suite ID");
  const prefix = `/suites/${suite.id}/runs/`;
  if (!run.finalOutput.startsWith(prefix) || run.finalOutput.split("/").some((part) => part === ".." || part.includes("\\"))) {
    throw new Error(`Run ${run.id} must store finalOutput under ${prefix}`);
  }
  const publicDir = path.posix.dirname(run.finalOutput);
  if (publicDir === prefix.slice(0, -1)) throw new Error(`Run ${run.id} needs its own artifact directory`);
  return { publicDir, diskDir: path.join(root, "public", publicDir) };
}

export function faviconImage(bytes, declaredType = "") {
  if (bytes.length > 2 * 1024 * 1024) return null;
  if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return { extension: "png", mime: "image/png" };
  if (bytes.subarray(0, 4).equals(Buffer.from([0, 0, 1, 0]))) return { extension: "ico", mime: "image/x-icon" };
  if (/^GIF8[79]a/.test(bytes.subarray(0, 6).toString())) return { extension: "gif", mime: "image/gif" };
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return { extension: "jpg", mime: "image/jpeg" };
  if (bytes.subarray(0, 4).toString() === "RIFF" && bytes.subarray(8, 12).toString() === "WEBP") return { extension: "webp", mime: "image/webp" };
  if (/^\s*(?:<\?xml[^>]*>\s*)?(?:<!--[\s\S]*?-->\s*)*<svg[\s>]/i.test(bytes.toString("utf8"))) return { extension: "svg", mime: "image/svg+xml" };
  if (declaredType === "image/avif") return { extension: "avif", mime: declaredType };
  return null;
}

export async function captureFavicon(page, context, directory) {
  const icons = await page.locator('link[rel~="icon"]').evaluateAll((links) => links.map((link) => ({ href: link.href, type: link.type })));
  icons.sort((a, b) => Number(b.type === "image/svg+xml") - Number(a.type === "image/svg+xml"));
  const candidates = [...new Set([...icons.map((icon) => icon.href), new URL("/favicon.ico", page.url()).href])];
  let unavailable = false;
  for (const source of candidates) {
    try {
      let bytes;
      let mime;
      if (source.startsWith("data:image/")) {
        const comma = source.indexOf(",");
        const header = source.slice(5, comma);
        mime = header.split(";")[0];
        bytes = header.includes(";base64") ? Buffer.from(source.slice(comma + 1), "base64") : Buffer.from(decodeURIComponent(source.slice(comma + 1)));
      } else {
        if (!["https:", "http:"].includes(new URL(source).protocol)) { unavailable = true; continue; }
        const response = await context.request.get(source, { timeout: 15000 });
        if (!response.ok()) { unavailable ||= response.status() !== 404; continue; }
        bytes = await response.body();
        mime = (response.headers()["content-type"] ?? "").split(";")[0];
      }
      const format = faviconImage(bytes, mime);
      if (!format) { unavailable = true; continue; }
      const name = `favicon.${format.extension}`;
      await writeFile(path.join(directory.diskDir, name), bytes);
      return { favicon: { path: `${directory.publicDir}/${name}`, source, mime: format.mime }, faviconStatus: "found" };
    } catch { unavailable = true; }
  }
  return { favicon: null, faviconStatus: unavailable ? "unavailable" : "missing" };
}

async function captureRun(browser, root, suite, run) {
  const directory = artifactDirectory(root, suite, run);
  const url = new URL(run.deployment);
  if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) throw new Error(`Invalid public deployment URL for ${run.id}`);
  await mkdir(directory.diskDir, { recursive: true });
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1, colorScheme: "light", reducedMotion: "reduce", locale: "en-US", timezoneId: "America/Los_Angeles" });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  try {
    const response = await page.goto(url.href, { waitUntil: "load", timeout: 45000 });
    await page.evaluate(async () => {
      await Promise.race([
        Promise.all([document.fonts.ready, ...[...document.images].map((image) => image.decode().catch(() => {}))]),
        new Promise((resolve) => setTimeout(resolve, 10000)),
      ]);
    });
    const icon = await captureFavicon(page, context, directory);
    await page.evaluate(() => window.scrollTo(0, 0));
    const screenshot = `${directory.publicDir}/storefront.png`;
    await page.screenshot({ path: path.join(directory.diskDir, "storefront.pending.png"), fullPage: false, animations: "disabled", timeout: 15000 });
    await rename(path.join(directory.diskDir, "storefront.pending.png"), path.join(directory.diskDir, "storefront.png"));
    return { screenshot, ...icon, url: page.url(), title: await page.title(), ...viewport, capturedAt: new Date().toISOString(), httpStatus: response?.status() ?? null, errors, browser: browser.version(), deviceScaleFactor: 1, colorScheme: "light", timezone: "America/Los_Angeles" };
  } finally { await context.close(); }
}

export async function captureSuite({ suite, root = projectRoot, browser, runId, overwrite = false, log = console.log }) {
  const runs = runId ? suite.runs.filter((run) => run.id === runId) : suite.runs;
  if (!runs.length) throw new Error(runId ? `No run ${runId} in ${suite.id}` : `No runs registered for ${suite.id}`);
  const directories = runs.map((run) => artifactDirectory(root, suite, run).publicDir);
  if (new Set(directories).size !== runs.length || new Set(runs.map((run) => run.id)).size !== runs.length) throw new Error("Run IDs and artifact directories must be unique within a suite");
  const suiteDir = path.join(root, "public/suites", suite.id);
  await mkdir(suiteDir, { recursive: true });
  const manifestFile = path.join(suiteDir, "storefronts.json");
  const errorsFile = path.join(suiteDir, "capture-errors.json");
  const captures = await readJson(manifestFile, {});
  const failures = await readJson(errorsFile, {});
  let failureCount = 0;
  for (const run of runs) {
    const directory = artifactDirectory(root, suite, run);
    if (!overwrite && captures[run.id]?.screenshot) {
      try {
        await access(path.join(directory.diskDir, "storefront.png"));
        if (captures[run.id].favicon) await access(path.join(root, "public", captures[run.id].favicon.path));
        log(`${run.id}: kept existing capture`);
        continue;
      } catch { /* Recover missing archived files. */ }
    }
    try {
      captures[run.id] = await captureRun(browser, root, suite, run);
      delete failures[run.id];
      await saveJson(manifestFile, captures);
      log(`${run.id}: HTTP ${captures[run.id].httpStatus}, favicon ${captures[run.id].faviconStatus}`);
    } catch (error) {
      failures[run.id] = { attemptedAt: new Date().toISOString(), url: run.deployment, error: error.message };
      failureCount++;
      log(`${run.id}: capture failed — ${error.message}`);
    }
    await saveJson(errorsFile, failures);
  }
  return { captures, failureCount };
}

async function main() {
  const args = process.argv.slice(2);
  const help = "npm run capture -- --suite <suite-id> [--run <run-id>] [--overwrite] [--browser chrome|chromium]";
  if (args.includes("--help")) { console.log(help); return; }
  const options = {};
  for (let i = 0; i < args.length; i++) {
    const key = args[i];
    if (key === "--overwrite") options.overwrite = true;
    else if (["--suite", "--run", "--browser"].includes(key) && args[i + 1] && !args[i + 1].startsWith("--")) options[key.slice(2)] = args[++i];
    else throw new Error(`Unknown or incomplete option: ${key}\n${help}`);
  }
  if (!options.suite) throw new Error(help);
  if (options.browser && !["chrome", "chromium"].includes(options.browser)) throw new Error("Browser must be chrome or chromium");
  const { suites } = await import("../app/data.ts");
  const suite = suites.find((candidate) => candidate.id === options.suite);
  if (!suite) throw new Error(`Unknown suite: ${options.suite}`);
  const browser = await chromium.launch({ headless: true, ...(options.browser === "chrome" ? { channel: "chrome" } : {}) });
  try {
    const result = await captureSuite({ suite, browser, runId: options.run, overwrite: options.overwrite });
    if (result.failureCount) process.exitCode = 1;
  } finally { await browser.close(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
