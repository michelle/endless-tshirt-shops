import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const script = path.join(root, "scripts", "browser-health.mjs");

function runHealth(url) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [script, url], { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("close", (status) => resolve({ status, stdout, stderr }));
  });
}

test("browser health catches hydrated application crashes, not just HTTP failures", async (t) => {
  const server = createServer((request, response) => {
    response.writeHead(200, { "content-type": "text/html" });
    if (request.url === "/broken") {
      response.end('<main>Loading</main><script>document.body.textContent="Application error: a client-side exception has occurred"; throw new Error("Unknown encoding: base64url")</script>');
    } else {
      response.end("<main>Healthy storefront</main>");
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => server.close());
  const port = server.address().port;

  const healthy = await runHealth(`http://127.0.0.1:${port}/healthy`);
  assert.equal(healthy.status, 0, healthy.stderr || healthy.stdout);
  assert.equal(JSON.parse(healthy.stdout).status, "healthy");

  const broken = await runHealth(`http://127.0.0.1:${port}/broken`);
  assert.equal(broken.status, 1, broken.stderr || broken.stdout);
  assert.equal(JSON.parse(broken.stdout).status, "failed");
});
