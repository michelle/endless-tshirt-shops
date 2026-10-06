import puppeteer from 'puppeteer-core';
const url = process.argv[2];
const out = process.argv[3] || '/tmp/site.png';
const w = Number(process.argv[4] || 1440);
const h = Number(process.argv[5] || 1000);
const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const page = await browser.newPage();
await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
await new Promise((r) => setTimeout(r, 2500));
// scroll through to trigger lazy images
await page.evaluate(async () => {
  const step = window.innerHeight * 0.8;
  for (let y = 0; y < document.body.scrollHeight; y += step) {
    window.scrollTo(0, y);
    await new Promise((r) => setTimeout(r, 350));
  }
  window.scrollTo(0, 0);
});
await new Promise((r) => setTimeout(r, 3500));
await page.screenshot({ path: out, fullPage: true });
console.log('saved', out);
await browser.close();
