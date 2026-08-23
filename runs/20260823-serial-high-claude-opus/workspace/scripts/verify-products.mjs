/**
 * Checks that every blank in the catalog can actually be quoted — with a real
 * shipping address, in every size we sell.
 *
 *   node scripts/verify-products.mjs
 *
 * Run this after changing SP_PRODUCTS or SP_SIZES, and periodically in
 * production. Scalable Press has plenty of catalog entries that quote fine
 * without an address and then return a bare HTTP 500 once you supply one, so
 * "the product page loads" is not evidence that you can sell it.
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const SP_API = process.env.SP_API_BASE ?? 'https://api.scalablepress.com/v2';

// Minimal .env.local loader so this works without extra dependencies.
if (!process.env.SP_AUTH) {
  const envPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
      const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
      if (match) process.env[match[1]] ??= match[2].replace(/^["']|["']$/g, '');
    }
  }
}

const SP_AUTH = process.env.SP_AUTH;
if (!SP_AUTH) {
  console.error('SP_AUTH is not set (put it in .env.local or the environment).');
  process.exit(1);
}
const AUTH = 'Basic ' + Buffer.from(`:${SP_AUTH}`).toString('base64');

// Kept in sync with src/lib/catalog.ts by hand — this script is deliberately
// dependency-free so it can run against a deployed environment's config too.
const PRODUCTS = {
  fitted: { id: 'next-level-fitted-crew', color: 'Black' },
  unisex: { id: 'gildan-ultra-cotton-t-shirt', color: 'Black' },
};
const SIZES = { S: 'sml', M: 'med', L: 'lrg', XL: 'xlg' };

/** A real, deliverable US address — the point is to exercise shipping and tax. */
const ADDRESS = {
  name: 'Ada Lovelace',
  address1: '510 Townsend St',
  city: 'San Francisco',
  state: 'CA',
  zip: '94103',
  country: 'US',
};

async function sp(path, body) {
  const res = await fetch(`${SP_API}${path}`, {
    method: 'POST',
    headers: { Authorization: AUTH, ...(body instanceof FormData ? {} : { 'Content-Type': 'application/json' }) },
    body: body instanceof FormData ? body : JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { message: text.slice(0, 160) };
  }
  return { status: res.status, json };
}

/**
 * Builds a blank PNG at the real print size. It has to be the real size:
 * Scalable Press rejects undersized artwork outright (a 1x1 pixel comes back as
 * `bad_value` on `sides[front][artwork]`), so a tiny placeholder can't be used
 * to test the rest of the chain.
 */
function blankPng(width, height) {
  const chunk = (type, data) => {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([length, body, crc]);
  };

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8 bits per channel
  ihdr[9] = 6; // RGBA
  // One filter byte + 4 opaque-white bytes per pixel, per scanline.
  const raw = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    const row = y * (1 + width * 4);
    raw[row] = 0;
    raw.fill(0xff, row + 1, row + 1 + width * 4);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

const artwork = blankPng(8 * 300, 376);

const form = new FormData();
form.append('type', 'dtg');
form.append('sides[front][artwork]', new Blob([artwork], { type: 'image/png' }), 'probe.png');
form.append('sides[front][dimensions][width]', '8');
form.append('sides[front][position][horizontal]', 'C');
form.append('sides[front][position][offset][top]', '3');

const design = await sp('/design', form);
if (!design.json.designId) {
  console.error(`design failed (HTTP ${design.status}):`, JSON.stringify(design.json).slice(0, 300));
  process.exit(1);
}
console.log(`design ok: ${design.json.designId} (mode: ${design.json.mode})\n`);

let failures = 0;

for (const [style, product] of Object.entries(PRODUCTS)) {
  for (const [label, size] of Object.entries(SIZES)) {
    const { status, json } = await sp('/quote', {
      type: 'dtg',
      designId: design.json.designId,
      products: [{ id: product.id, color: product.color, size, quantity: 1 }],
      address: ADDRESS,
    });

    const issues = json.orderIssues?.length ? ` issues=${JSON.stringify(json.orderIssues)}` : '';
    const ok = status === 200 && Boolean(json.orderToken) && !json.orderIssues?.length;
    if (!ok) failures++;

    console.log(
      `${ok ? 'PASS' : 'FAIL'}  ${style.padEnd(7)} ${label.padEnd(3)} ${product.id.padEnd(30)} ` +
        `HTTP ${status} ` +
        (status === 200
          ? `total=$${json.total} token=${json.orderToken ? 'yes' : 'MISSING'}${issues}`
          : (json.message ?? JSON.stringify(json.issues ?? json).slice(0, 120))),
    );
  }
}

console.log(failures === 0 ? '\nAll blanks are sellable.' : `\n${failures} combination(s) cannot be sold.`);
process.exit(failures === 0 ? 0 : 1);
