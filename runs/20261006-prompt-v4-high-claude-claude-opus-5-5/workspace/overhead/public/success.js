import { parse } from './vendor/opentype.mjs';
import { renderSVG, SHIRTS } from './shared/render.js';
import { shirtSVG, ART } from './shared/mockup.js';

const $ = (id) => document.getElementById(id);
const sessionId = new URLSearchParams(location.search).get('session_id');
const KEYS = ['lat', 'lon', 't', 'headline', 'place', 'dateLine', 'coords', 'ink', 'lines', 'names', 'planets', 'ecliptic'];

function decode(token) {
  const b64 = token.replace(/-/g, '+').replace(/_/g, '/');
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const arr = JSON.parse(new TextDecoder().decode(bytes));
  return Object.fromEntries(KEYS.map((k, i) => [k, arr[i]]));
}

let drawn = false;
async function drawPreview(r) {
  if (drawn || !r.designToken || !SHIRTS[r.color]) return;
  drawn = true;
  const load = (u) => fetch(u).then((x) => x.arrayBuffer()).then(parse);
  const [serif, sans, sansMedium] = await Promise.all([load('/fonts/cormorant-600.ttf'), load('/fonts/jost-400.ttf'), load('/fonts/jost-500.ttf')]);
  const shirt = SHIRTS[r.color];
  const { svg } = renderSVG(decode(r.designToken), { serif, sans, sansMedium }, { crop: true, x: ART.x, y: ART.y, width: ART.w, height: ART.h });
  $('stage').innerHTML = shirtSVG(shirt.hex, svg, shirt.tone);
}

async function poll(attempt = 0) {
  if (!sessionId) {
    $('lede').textContent = 'No order reference found.';
    return;
  }
  try {
    const res = await fetch(`/api/order?session_id=${encodeURIComponent(sessionId)}`);
    const r = await res.json();
    if (!res.ok) throw new Error(r.error || 'Could not load order');
    drawPreview(r);
    const paid = r.paymentStatus === 'paid';
    $('st-paid').classList.toggle('done', paid);
    $('st-print').classList.toggle('done', r.state === 'sent_to_print');
    if (r.state === 'sent_to_print') {
      const total = new Intl.NumberFormat('en-US', { style: 'currency', currency: (r.currency || 'usd').toUpperCase() }).format(r.amountTotal / 100);
      $('lede').textContent = `We've charged ${total} and sent ${r.qty > 1 ? `${r.qty} shirts` : 'your shirt'} (${SHIRTS[r.color]?.label}, ${r.size?.toUpperCase()}) to print. Your payment receipt goes to ${r.email || 'your email'}. Keep the reference below for any questions.`;
      $('refs').textContent = `Order ${r.sessionId.slice(-12)} · Print job ${r.prodigiOrderId}${r.prodigiStatus ? ` (${r.prodigiStatus})` : ''}`;
      return;
    }
    if (!paid) {
      $('eyebrow').textContent = 'Awaiting payment';
      $('title').textContent = 'Almost there…';
      $('lede').textContent = 'Your payment is still processing. This page will update automatically. Nothing is printed until payment succeeds.';
    }
  } catch (e) {
    $('lede').textContent = e.message;
  }
  if (attempt < 20) setTimeout(() => poll(attempt + 1), Math.min(2000 + attempt * 1000, 8000));
}

poll();
