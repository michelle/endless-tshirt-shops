const zlib = require('zlib');
const STRIPE_API = 'https://api.stripe.com/v1';
const SP_API = 'https://api.scalablepress.com/v2';

function stripeKey() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('Stripe is not configured. Add STRIPE_SECRET_KEY to this Vercel project.');
  return process.env.STRIPE_SECRET_KEY;
}

async function stripe(path, body) {
  const response = await fetch(`${STRIPE_API}${path}`, {
    method: body ? 'POST' : 'GET',
    headers: {Authorization: `Bearer ${stripeKey()}`, ...(body ? {'Content-Type':'application/x-www-form-urlencoded'} : {})},
    body: body ? new URLSearchParams(body).toString() : undefined,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || 'Stripe request failed.');
  return data;
}

function validateProduct({style, size, timestamp}) {
  if (!['fitted','unisex'].includes(style) || !['S','M','L','XL'].includes(size)) throw new Error('Please choose a valid shirt style and size.');
  const safeTimestamp = String(timestamp || '');
  if (!/^\d{13}$/.test(safeTimestamp)) throw new Error('The timestamp is invalid. Please try again.');
  return safeTimestamp;
}

const GLYPHS = {
  '0':['111','101','101','101','111'], '1':['010','110','010','010','111'], '2':['111','001','111','100','111'], '3':['111','001','111','001','111'], '4':['101','101','111','001','001'],
  '5':['111','100','111','001','111'], '6':['111','100','111','101','111'], '7':['111','001','010','010','010'], '8':['111','101','111','101','111'], '9':['111','101','111','001','111'],
};
function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) { crc ^= byte; for (let bit=0; bit<8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1)); }
  return (crc ^ 0xffffffff) >>> 0;
}
function pngChunk(type, data) {
  const name = Buffer.from(type); const length = Buffer.alloc(4); length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4); checksum.writeUInt32BE(crc32(Buffer.concat([name,data])));
  return Buffer.concat([length,name,data,checksum]);
}
function artwork(timestamp) {
  const width = 1800, height = 600, scale = 42, cellWidth = 4 * scale, textWidth = timestamp.length * cellWidth - scale;
  const pixels = Buffer.alloc((width * 4 + 1) * height);
  const startX = Math.floor((width - textWidth) / 2), startY = Math.floor((height - 5 * scale) / 2);
  for (let y=0; y<height; y++) pixels[y * (width * 4 + 1)] = 0;
  [...timestamp].forEach((digit, index) => {
    GLYPHS[digit].forEach((row,rowIndex) => [...row].forEach((on,columnIndex) => {
      if (on !== '1') return;
      for (let y=startY + rowIndex * scale; y<startY + (rowIndex + 1) * scale; y++) for (let x=startX + index * cellWidth + columnIndex * scale; x<startX + index * cellWidth + (columnIndex + 1) * scale; x++) {
        const offset = y * (width * 4 + 1) + 1 + x * 4; pixels[offset] = 255; pixels[offset+1] = 255; pixels[offset+2] = 255; pixels[offset+3] = 255;
      }
    }));
  });
  const header = Buffer.alloc(13); header.writeUInt32BE(width,0); header.writeUInt32BE(height,4); header[8]=8; header[9]=6;
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), pngChunk('IHDR',header), pngChunk('IDAT',zlib.deflateSync(pixels)), pngChunk('IEND',Buffer.alloc(0))]);
}

function shippingAddress(session) {
  const shipping = session.shipping_details || session.collected_information?.shipping_details;
  const address = shipping?.address;
  if (!shipping?.name || !address?.line1 || !address?.city || !address?.postal_code || !address?.country) throw new Error('Stripe did not return a complete shipping address.');
  return {name: shipping.name, address1: address.line1, address2: address.line2 || '', city: address.city, state: address.state || '', zip: address.postal_code, country: address.country};
}

async function scalablePress(path, options = {}) {
  if (!process.env.SP_AUTH) throw new Error('Scalable Press is not configured. Add SP_AUTH to this Vercel project.');
  const headers = {Authorization: `Basic ${Buffer.from(`:${process.env.SP_AUTH}`).toString('base64')}`, ...(options.headers || {})};
  const response = await fetch(`${SP_API}${path}`, {...options, headers});
  const data = await response.json().catch(() => ({}));
  if (!response.ok || Number(data.statusCode) >= 300) {
    const issue = data?.message || data?.orderIssues?.[0]?.message || data?.issues?.[0]?.message || 'Scalable Press request failed.';
    throw new Error(issue);
  }
  return data;
}

async function fulfill(session) {
  const timestamp = validateProduct({style: session.metadata?.style, size: session.metadata?.size, timestamp: session.metadata?.timestamp});
  const style = session.metadata.style;
  const size = session.metadata.size;
  // The former fitted SKU is accepted by the catalog but currently fails the quote
  // endpoint in the test environment. Use the verified, soft Next Level crew SKU
  // for both presentation cuts until a replacement fitted SKU is selected in SP.
  const products = {fitted:'next-level-fitted-crew', unisex:'next-level-fitted-crew'};
  const sizes = {S:'sml', M:'med', L:'lrg', XL:'xlg'};
  const form = new FormData();
  form.set('type', 'dtg');
  form.set('sides[front][artwork]', new Blob([artwork(timestamp)], {type:'image/png'}), `datetime-${timestamp}.png`);
  form.set('sides[front][dimensions][width]', '8');
  form.set('sides[front][position][horizontal]', 'C');
  form.set('sides[front][position][offset][top]', '3');
  const design = await scalablePress('/design', {method:'POST', body:form});
  const quote = await scalablePress('/quote', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({type:'dtg', designId:design.designId, products:[{id:products[style], color:'Black', quantity:1, size:sizes[size]}], address:shippingAddress(session)})});
  if (!quote.orderToken) throw new Error('Scalable Press could not create an order quote.');
  const order = await scalablePress('/order', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({orderToken:quote.orderToken})});
  if (!order.orderId) throw new Error('Scalable Press did not return an order ID.');
  return order.orderId;
}

function json(res, code, data) { res.status(code).setHeader('Content-Type','application/json'); res.end(JSON.stringify(data)); }
module.exports = {stripe, validateProduct, artwork, fulfill, json};
