import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const source = await readFile(path.join(root, "worker/index.js"), "utf8");
const page = await readFile(path.join(root, "index.html"), "utf8");
if (!source.includes("__STOREFRONT_HTML__")) throw new Error("Worker storefront placeholder is missing.");
const dist = path.join(root, "dist");
await rm(dist, { recursive:true, force:true });
await mkdir(path.join(dist, "server"), { recursive:true });
await mkdir(path.join(dist, ".openai"), { recursive:true });
await writeFile(path.join(dist, "server/index.js"), source.replace("__STOREFRONT_HTML__", JSON.stringify(page)));
await cp(path.join(root, ".openai/hosting.json"), path.join(dist, ".openai/hosting.json"));
console.log("Built Sites Worker and embedded storefront.");
