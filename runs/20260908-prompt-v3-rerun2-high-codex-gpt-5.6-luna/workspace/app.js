const initialDesign = { phrase: 'KEEP GOING', style: 'ORBIT', ink: 'coral', shirtColor: 'black', shirtSize: 'm' };
let design = { ...initialDesign };
let bag = JSON.parse(localStorage.getItem('signal-bloom-bag') || '[]');

const $ = (id) => document.getElementById(id);
const inkValues = { coral: '#ff725e', lime: '#c7f464', lilac: '#b9a7ff', sky: '#8edbff' };
const colorValues = { black: '#0f1013', natural: '#d6c9b7', 'navy blue': '#202b43', 'sport grey': '#989898', white: '#efeee8' };

function codeFor(value) {
  let hash = 7;
  for (const char of value) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return `SB-${String(hash % 900 + 100)}`;
}

function renderPreview() {
  const words = design.phrase.trim().split(/\s+/).filter(Boolean);
  const lineOne = (words[0] || 'KEEP').slice(0, 12);
  const lineTwo = words.slice(1).join(' ').slice(0, 12);
  $('previewPhrase').innerHTML = `${lineOne}${lineTwo ? `<br><i>${lineTwo}</i>` : ''}`;
  $('previewStyle').textContent = design.style;
  $('previewCode').textContent = codeFor(`${design.phrase}${design.style}`);
  document.documentElement.style.setProperty('--preview-ink', inkValues[design.ink]);
  document.documentElement.style.setProperty('--preview-shirt', colorValues[design.shirtColor]);
  $('studioPreview').style.setProperty('--preview-ink', inkValues[design.ink]);
  $('studioPreview').style.setProperty('--preview-shirt', colorValues[design.shirtColor]);
}

function persist() { localStorage.setItem('signal-bloom-bag', JSON.stringify(bag)); }
function money(cents) { return `$${(cents / 100).toFixed(2)}`; }
function renderBag() {
  const count = bag.reduce((sum, item) => sum + item.quantity, 0);
  $('bagCount').textContent = count;
  $('drawerCount').textContent = `(${count})`;
  if (!bag.length) {
    $('bagItems').innerHTML = '<div class="empty-bag"><span>✦</span><p>Your signal is waiting.</p><a href="#customizer" id="emptyLink">Make a tee</a></div>';
    $('drawerFooter').hidden = true;
    return;
  }
  $('bagItems').innerHTML = bag.map((item, index) => `<article class="bag-item"><div class="bag-thumb" style="--thumb-ink:${inkValues[item.design.ink]};--thumb-shirt:${colorValues[item.design.shirtColor]}"></div><div class="bag-info"><h3>${item.design.phrase}</h3><p>${item.design.style} · ${item.design.shirtColor}<br />size ${item.design.shirtSize} · qty ${item.quantity}</p><button class="remove-item" data-remove="${index}" type="button">Remove</button></div><strong class="bag-price">${money(3400 * item.quantity)}</strong></article>`).join('');
  $('subtotal').textContent = money(bag.reduce((sum, item) => sum + 3400 * item.quantity, 0));
  $('drawerFooter').hidden = false;
}
function showToast(message) { $('toast').textContent = message; $('toast').classList.add('show'); setTimeout(() => $('toast').classList.remove('show'), 3000); }
function openBag() { $('bagDrawer').classList.add('open'); $('bagDrawer').setAttribute('aria-hidden', 'false'); renderBag(); }
function closeBag() { $('bagDrawer').classList.remove('open'); $('bagDrawer').setAttribute('aria-hidden', 'true'); }

$('phrase').addEventListener('input', (event) => { design.phrase = event.target.value.replace(/[<>]/g, '').toUpperCase(); renderPreview(); });
$('shirtColor').addEventListener('change', (event) => { design.shirtColor = event.target.value; renderPreview(); });
$('shirtSize').addEventListener('change', (event) => { design.shirtSize = event.target.value; });
document.querySelectorAll('[data-style]').forEach((button) => button.addEventListener('click', () => { design.style = button.dataset.style; document.querySelectorAll('[data-style]').forEach((item) => item.classList.toggle('active', item === button)); renderPreview(); }));
document.querySelectorAll('[data-ink]').forEach((button) => button.addEventListener('click', () => { design.ink = button.dataset.ink; document.querySelectorAll('[data-ink]').forEach((item) => item.classList.toggle('active', item === button)); renderPreview(); }));
$('addButton').addEventListener('click', () => { const phrase = design.phrase.trim() || 'KEEP GOING'; const existing = bag.find((item) => JSON.stringify(item.design) === JSON.stringify({ ...design, phrase })); if (existing) existing.quantity = Math.min(5, existing.quantity + 1); else bag.push({ design: { ...design, phrase }, quantity: 1 }); persist(); renderBag(); openBag(); showToast('Your one-of-one signal is in the bag.'); });
$('bagButton').addEventListener('click', openBag); $('closeDrawer').addEventListener('click', closeBag); $('drawerScrim').addEventListener('click', closeBag); $('emptyLink').addEventListener('click', closeBag);
$('bagItems').addEventListener('click', (event) => { const button = event.target.closest('[data-remove]'); if (!button) return; bag.splice(Number(button.dataset.remove), 1); persist(); renderBag(); });
$('checkoutButton').addEventListener('click', async () => { const button = $('checkoutButton'); button.disabled = true; button.innerHTML = 'Opening secure checkout…'; try { const response = await fetch('/api/create-checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: bag }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Checkout could not be started.'); window.location.href = data.url; } catch (error) { showToast(error.message); button.disabled = false; button.innerHTML = 'Pay securely with Stripe <span>↗</span>'; } });

const query = new URLSearchParams(window.location.search);
if (query.get('success')) { bag = []; persist(); renderBag(); showToast('Payment received — your signal is entering production.'); history.replaceState({}, '', '/'); }
if (query.get('canceled')) { showToast('Checkout canceled. Your signal is still in the bag.'); history.replaceState({}, '', '/'); }
renderPreview(); renderBag();
