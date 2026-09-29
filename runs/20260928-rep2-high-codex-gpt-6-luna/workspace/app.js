const form = document.querySelector('#customizer');
const fields = ['words', 'place', 'date', 'lat', 'lon', 'color', 'size'];
const enc = (s) => encodeURIComponent(s || '');
function seedOf(s) { let h = 2166136261; for (const ch of s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function randomizer(seed) { return () => { seed += 0x6D2B79F5; let t = seed; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function makeConstellation() {
  const words = document.querySelector('#words').value.trim() || 'a moment worth keeping';
  const date = document.querySelector('#date').value || '2000-01-01';
  const lat = Number(document.querySelector('#lat').value) || 0;
  const lon = Number(document.querySelector('#lon').value) || 0;
  const rand = randomizer(seedOf(`${words}|${date}|${lat.toFixed(4)}|${lon.toFixed(4)}`));
  const stars = Array.from({length: 11}, () => ({x: 32 + rand() * 186, y: 22 + rand() * 152, r: 1.4 + rand() * 1.7}));
  const lines = [];
  for (let i = 1; i < stars.length; i++) lines.push(`<path d="M${stars[i-1].x.toFixed(1)} ${stars[i-1].y.toFixed(1)} L${stars[i].x.toFixed(1)} ${stars[i].y.toFixed(1)}"/>`);
  const dots = stars.map(p => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${p.r.toFixed(1)}"/>`).join('');
  return `<circle cx="125" cy="100" r="78" fill="none" stroke="#d4c99e" stroke-opacity=".15"/><circle cx="125" cy="100" r="91" fill="none" stroke="#d4c99e" stroke-opacity=".1" stroke-dasharray="1 5"/><g stroke="#d4c99e" stroke-opacity=".55" fill="none" stroke-width=".8">${lines.join('')}</g><g fill="#f4e8be">${dots}</g><path d="M125 7v8m0 170v8M32 100h8m170 0h8" stroke="#d4c99e" stroke-opacity=".5"/>`;
}
function updatePreview() {
  const words = document.querySelector('#words').value.trim();
  const place = document.querySelector('#place').value.trim();
  const lat = Number(document.querySelector('#lat').value) || 0;
  const lon = Number(document.querySelector('#lon').value) || 0;
  const latText = `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? 'N' : 'S'}`;
  const lonText = `${Math.abs(lon).toFixed(4)}° ${lon >= 0 ? 'E' : 'W'}`;
  document.querySelector('#preview-words').textContent = words.toUpperCase();
  document.querySelector('#preview-svg').innerHTML = makeConstellation();
  document.querySelector('#preview-coords').textContent = `${latText} · ${lonText}`;
  document.querySelector('#preview-place').textContent = (place || 'YOUR PLACE').toUpperCase();
  const colors = {'black':'#252c28','navy blue':'#28333d','white':'#e9e7dd','natural':'#b9ad91','army':'#555a45'};
  document.querySelector('#preview-shirt').style.background = colors[document.querySelector('#color').value] || '#252c28';
}
fields.forEach(id => document.querySelector(`#${id}`).addEventListener('input', updatePreview));
form.addEventListener('change', updatePreview);
updatePreview();
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const notice = document.querySelector('#notice');
  const button = form.querySelector('button[type="submit"]');
  notice.classList.remove('show');
  button.disabled = true;
  button.innerHTML = 'Preparing… <span>✦</span>';
  const data = Object.fromEntries(fields.map(id => [id, document.querySelector(`#${id}`).value]));
  try {
    const response = await fetch('/api/checkout', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Checkout is unavailable right now.');
    window.location.href = result.url;
  } catch (error) {
    notice.textContent = error.message;
    notice.classList.add('show');
    button.disabled = false;
    button.innerHTML = 'Make mine <span>↗</span>';
  }
});
