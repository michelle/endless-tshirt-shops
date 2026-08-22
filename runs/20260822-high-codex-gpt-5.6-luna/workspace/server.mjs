import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
const mime = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json" };
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  if (url.pathname.startsWith("/api/")) {
    res.statusCode = 501;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Use `vercel dev` for local API routes, or deploy to Vercel." }));
    return;
  }
  const requested = url.pathname === "/" ? "/index.html" : url.pathname;
  const filePath = normalize(join(root, requested));
  if (!filePath.startsWith(root)) { res.statusCode = 403; res.end("Forbidden"); return; }
  try {
    const body = await readFile(filePath);
    res.statusCode = 200;
    res.setHeader("Content-Type", mime[extname(filePath)] || "application/octet-stream");
    res.end(body);
  } catch {
    const body = await readFile(join(root, "index.html"));
    res.statusCode = 200;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.end(body);
  }
});
const port = Number(process.env.PORT || 3000);
server.listen(port, () => console.log(`datetime.store running at http://localhost:${port}`));
