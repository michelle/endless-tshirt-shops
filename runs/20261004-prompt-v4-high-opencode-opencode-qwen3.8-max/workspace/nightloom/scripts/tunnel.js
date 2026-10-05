#!/usr/bin/env node
/**
 * NightLoom public-exposure supervisor.
 *
 * Keeps a reverse SSH tunnel (localhost.run / pinggy.io / serveo.net — tried in
 * order) connected to the local store, publishes the current public HTTPS URL
 * to data/public_url.txt (the app reads it to build asset/checkout URLs) and
 * restarts the tunnel automatically when it drops. Also verifies reachability
 * through the tunnel by polling /healthz.
 *
 * Usage: node scripts/tunnel.js
 */
const { spawn, execFile } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const URL_FILE = path.join(ROOT, 'data', 'public_url.txt');
const LOG_FILE = path.join(ROOT, 'logs', 'tunnel.log');
const PORT = process.env.PORT || '8080';

const PROVIDERS = [
  {
    name: 'localhost.run',
    args: ['-R', `80:localhost:${PORT}`, '-o', 'StrictHostKeyChecking=no', '-o', 'ServerAliveInterval=20', '-o', 'ExitOnForwardFailure=yes', 'nokey@localhost.run'],
    parse: (line) => (line.match(/https:\/\/[a-z0-9][a-z0-9.-]*\.lhr\.life/i) || [])[0],
  },
  {
    name: 'pinggy.io',
    args: ['-p', '443', '-R0:localhost:' + PORT, '-o', 'StrictHostKeyChecking=no', '-o', 'ServerAliveInterval=20', '-o', 'ExitOnForwardFailure=yes', 'a.pinggy.io'],
    parse: (line) => (line.match(/https:\/\/[a-z0-9][a-z0-9.-]*\.pinggy\.io/i) || [])[0],
  },
  {
    name: 'serveo.net',
    args: ['-R', `80:localhost:${PORT}`, '-o', 'StrictHostKeyChecking=no', '-o', 'ServerAliveInterval=20', '-o', 'ExitOnForwardFailure=yes', 'serveo.net'],
    parse: (line) => (line.match(/https:\/\/[a-z0-9][a-z0-9.-]*\.serveo\.net/i) || [])[0],
  },
];

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  try { fs.appendFileSync(LOG_FILE, line + '\n'); } catch { /* ignore */ }
}
fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });

function writeUrl(url) {
  try {
    const prev = fs.existsSync(URL_FILE) ? fs.readFileSync(URL_FILE, 'utf8').trim() : '';
    if (prev !== url) {
      fs.writeFileSync(URL_FILE, url + '\n');
      log(`PUBLIC URL -> ${url}`);
    }
  } catch (e) { log('write url failed: ' + e.message); }
}

let currentUrl = null;
let child = null;
let stopping = false;
let backoff = 1000;
let providerIdx = 0;

async function reachable(url) {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 9000);
    const res = await fetch(`${url}/healthz`, { signal: ctrl.signal });
    clearTimeout(t);
    return res.ok;
  } catch { return false; }
}

function startTunnel() {
  if (stopping) return;
  const provider = PROVIDERS[providerIdx % PROVIDERS.length];
  log(`starting tunnel via ${provider.name} (ssh ${provider.args.join(' ')})`);
  const ssh = spawn('ssh', provider.args, { stdio: ['ignore', 'pipe', 'pipe'] });
  child = ssh;
  let urlFound = false;
  let outBuf = '';

  const onData = (chunk) => {
    outBuf += chunk.toString();
    const lines = outBuf.split('\n');
    outBuf = lines.pop();
    for (const line of lines) {
      const u = provider.parse(line);
      if (u && !urlFound) {
        urlFound = true;
        currentUrl = u.replace(/\/+$/, '');
        writeUrl(currentUrl);
        backoff = 1000;
        (async () => {
          const ok = await reachable(currentUrl);
          log(`healthz through tunnel: ${ok ? 'OK' : 'FAILED'}`);
        })();
      }
    }
  };
  ssh.stdout.on('data', onData);
  ssh.stderr.on('data', onData);

  ssh.on('error', (e) => log(`ssh error: ${e.message}`));
  ssh.on('exit', (code) => {
    log(`tunnel (${provider.name}) exited code=${code}`);
    child = null;
    if (stopping) return;
    // rotate provider if we never even got a URL
    if (!urlFound) providerIdx++;
    const wait = Math.min(30000, backoff);
    backoff = Math.min(60000, backoff * 2);
    setTimeout(startTunnel, wait);
  });
}

// heartbeat: verify the tunnel still serves; force reconnect if not
setInterval(async () => {
  if (!currentUrl || !child) return;
  const ok = await reachable(currentUrl);
  if (!ok) {
    log('heartbeat failed; killing tunnel for reconnect');
    try { child.kill('SIGTERM'); } catch { /* ignore */ }
  }
}, 45000).unref();

process.on('SIGTERM', () => { stopping = true; try { child && child.kill(); } catch {} process.exit(0); });
process.on('SIGINT', () => { stopping = true; try { child && child.kill(); } catch {} process.exit(0); });

startTunnel();
