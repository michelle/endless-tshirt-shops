// Local dev server — mirrors how Vercel serves this project:
// static files from the repo root + /api/* as Node functions.
const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const ROOT = path.join(__dirname, "..");
const PORT = process.env.PORT || 3177;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

const apiHandlers = {};
for (const f of fs.readdirSync(path.join(ROOT, "api"))) {
  if (f.endsWith(".js")) apiHandlers["/api/" + f.slice(0, -3)] = require("../api/" + f);
}

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, "http://localhost:" + PORT);
  const pathname = decodeURIComponent(u.pathname);

  if (apiHandlers[pathname]) {
    req.query = Object.fromEntries(u.searchParams.entries());
    try {
      await apiHandlers[pathname](req, res);
    } catch (e) {
      console.error(e);
      res.statusCode = 500;
      res.end(JSON.stringify({ error: "internal error" }));
    }
    return;
  }

  let file = pathname === "/" ? "/index.html" : pathname;
  const full = path.normalize(path.join(ROOT, file));
  if (!full.startsWith(ROOT) || file.startsWith("/api") || file.startsWith("/node_modules")) {
    res.statusCode = 403;
    return res.end("forbidden");
  }
  fs.readFile(full, (err, data) => {
    if (err) {
      res.statusCode = 404;
      return res.end("not found");
    }
    res.setHeader("Content-Type", MIME[path.extname(full)] || "application/octet-stream");
    res.end(data);
  });
});

server.listen(PORT, () => console.log("Written in the Stars — dev server on http://localhost:" + PORT));
