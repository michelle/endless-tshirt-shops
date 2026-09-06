import { copyFile, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { isPublishedArchivePath, redactForPages } from "./pages-redaction.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const source = resolve(root, "public");
const output = resolve(root, "out");
let redacted = 0;
let copied = 0;

async function archive(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const path = join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error("Refusing to publish symlink in archive");
    if (entry.isDirectory()) { await archive(path); continue; }
    const name = relative(source, path).split("\\").join("/");
    if (!isPublishedArchivePath(name)) continue;
    const destination = join(output, name);
    await mkdir(dirname(destination), { recursive: true });
    if (/\.(?:md|json|svg)$/.test(name)) {
      const original = await readFile(path, "utf8");
      let published = redactForPages(original);
      if (published !== original) {
        redacted++;
        if (name.endsWith(".md")) published = "> Public copy: sensitive links and contact details have been redacted.\n\n" + published;
      }
      if (name.endsWith(".json")) JSON.parse(published);
      await writeFile(destination, published);
    } else {
      // No resizing, flattening, or re-encoding of artwork or screenshots.
      await copyFile(path, destination);
    }
    copied++;
  }
}

await archive(source);
await writeFile(join(output, ".nojekyll"), "");
console.log(`Prepared ${copied} archive files; redacted ${redacted} public text copies. Local originals unchanged.`);
