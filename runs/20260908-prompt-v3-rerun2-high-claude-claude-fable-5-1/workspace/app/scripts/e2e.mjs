import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const design = {
  place: "Santa Fe, New Mexico, United States", lat: 35.687, lon: -105.9378, date: "2022-09-17", time: "21:00",
  tz: "America/Denver", title: "I do", subtitle: "Priya & Marcus", lines: true, color: "navy blue", size: "l",
};
const res = await fetch(`${BASE}/api/checkout`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ design, quantity: 2 }) });
const { url, id } = await res.json();
console.log("session", id);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
try {
  await page.goto(url, { waitUntil: "load", timeout: 60000 });
  await page.waitForSelector("#email", { timeout: 60000 });
  await page.screenshot({ path: "/tmp/e2e-1-checkout.png", fullPage: true });
  await page.fill("#email", "test-buyer@example.com");
  const phone = page.locator("#phoneNumber");
  if (await phone.count()) await phone.fill("5055550123");
  // Shipping
  await page.fill("#shippingName", "Priya Test");
  const country = page.locator("#shippingCountry");
  if (await country.count()) await country.selectOption("US");
  await page.fill("#shippingAddressLine1", "123 Canyon Road");
  await page.keyboard.press("Escape");
  await page.getByText("Shipping information", { exact: true }).click({ force: true }).catch(() => {});
  const closeSuggest = page.locator("button[aria-label=\"Close\"]").first();
  if (await closeSuggest.count()) await closeSuggest.click({ force: true }).catch(() => {});
  await page.fill("#shippingLocality", "Santa Fe");
  await page.fill("#shippingPostalCode", "87501");
  const state = page.locator("#shippingAdministrativeArea");
  if (await state.count()) await state.selectOption("NM");
  // Shipping option (choose Express if a radio exists)
  const express = page.getByText("Express", { exact: false }).first();
  if (await express.count()) await express.click().catch(() => {});
  // Pick the Card payment method and opt out of Link
  const cardTab = page.getByText("Card", { exact: true }).first();
  if (await cardTab.count()) await cardTab.click({ force: true }).catch(() => {});
  await page.waitForTimeout(500);
  if (!(await page.locator("#cardNumber").count())) await page.getByRole("radio", { name: /card/i }).first().check({ force: true }).catch(() => {});
  const linkSave = page.locator("#enableStripePass");
  if (await linkSave.count() && await linkSave.isChecked().catch(() => false)) await linkSave.uncheck().catch(() => {});
  await page.waitForSelector("#cardNumber", { timeout: 20000 });
  // Card details
  await page.fill("#cardNumber", "4242424242424242");
  await page.fill("#cardExpiry", "12/34");
  await page.fill("#cardCvc", "123");
  const billingName = page.locator("#billingName");
  if (await billingName.count() && await billingName.isVisible()) await billingName.fill("Priya Test");
  const sameAsShipping = page.locator("#billingAddressSameAsShipping, input[name=billingAddressSameAsShipping]");
  if (await sameAsShipping.count() && !(await sameAsShipping.first().isChecked().catch(() => true))) await sameAsShipping.first().check();
  await page.screenshot({ path: "/tmp/e2e-2-filled.png", fullPage: true });
  await page.click("button[type=submit].SubmitButton, .SubmitButton");
  await page.waitForURL(/\/orders\/cs_/, { timeout: 90000 });
  console.log("redirected to", page.url());
  await page.waitForSelector("text=Sent to the printer", { timeout: 90000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: "/tmp/e2e-3-order.png", fullPage: true });
  console.log("ORDER PAGE OK");
} catch (e) {
  console.error("E2E FAILED", e.message);
  await page.screenshot({ path: "/tmp/e2e-fail.png", fullPage: true }).catch(() => {});
  process.exitCode = 1;
} finally {
  await browser.close();
}
