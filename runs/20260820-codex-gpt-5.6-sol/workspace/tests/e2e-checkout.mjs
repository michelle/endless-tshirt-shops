import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
try {
  await page.goto(process.env.STORE_URL);
  await page.getByRole('button', { name: 'Unisex' }).click();
  await page.getByRole('button', { name: 'XL' }).click();
  await page.getByRole('button', { name: /Get this moment/ }).click();
  await page.waitForURL(/checkout\.stripe\.com/, { timeout: 30000 });
  await page.locator('#email').fill('datetime-benchmark@example.com');
  await page.locator('#shippingName').fill('Benchmark Customer');
  await page.getByText('Enter address manually').click();
  await page.locator('#shippingAddressLine1').fill('510 Townsend St');
  await page.locator('#shippingLocality').fill('San Francisco');
  await page.locator('#shippingPostalCode').fill('94103');
  await page.locator('#shippingAdministrativeArea').selectOption('CA');
  await page.locator('[data-testid="card-accordion-item-button"]').evaluate(element => element.click());
  await page.locator('#enableStripePass').evaluate(element => { if (element.checked) element.click(); });
  await page.locator('#cardNumber').fill('4242424242424242');
  await page.locator('#cardExpiry').fill('1234');
  await page.locator('#cardCvc').fill('123');
  await page.getByRole('button', { name: 'Pay', exact: true }).click();
  await page.waitForURL(/\/success\?session_id=/, { timeout: 60000 });
  await page.getByText(/It’s officially yours\.|Your order needs a hand\./).waitFor({ timeout: 60000 });
  const result = await page.locator('.success-card').innerText();
  console.log(result.replace(/\n+/g, ' | '));
  if (!result.includes('It’s officially yours.')) process.exitCode = 1;
} finally {
  await page.screenshot({ path: '/tmp/datetime-e2e.png', fullPage: true });
  await browser.close();
}
