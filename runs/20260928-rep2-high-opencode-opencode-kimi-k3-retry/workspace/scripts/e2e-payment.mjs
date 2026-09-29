// E2E: create checkout on the live site, pay with Stripe test card, verify fulfillment.
import { chromium } from "playwright";

const SITE = process.argv[2] || "https://benchmark-20260928-rep2-high-openco-seven.vercel.app";
const WORD = process.argv[3] || `e2e-${Date.now().toString(36)}`;
const HEADED = process.env.HEADED === "1";

async function clickCardRow(page) {
  // click the visible "Card" accordion text (proven to expand the section)
  const row = page.getByText(/^Card$/, { exact: true }).first();
  if (!(await row.count())) return false;
  const box = await row.boundingBox();
  if (!box) return false;
  await page.mouse.click(box.x + 10, box.y + box.height / 2);
  return true;
}

async function findCardFrame(page, tries = 20) {
  for (let i = 0; i < tries; i++) {
    for (const f of page.frames()) {
      try {
        if (await f.locator("#Field-numberInput").count()) return f;
      } catch {}
    }
    await page.waitForTimeout(700);
  }
  return null;
}

async function main() {
  console.log(`1) creating checkout session on ${SITE} for word "${WORD}"`);
  const res = await fetch(`${SITE}/api/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ word: WORD, palette: "ember", color: "black", size: "l", qty: 1 }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`checkout failed: ${JSON.stringify(data)}`);
  console.log(`   session: ${data.id}`);

  const browser = await chromium.launch({
    headless: !HEADED,
    args: ["--disable-blink-features=AutomationControlled"],
  });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1100 } });
  const page = await ctx.newPage();
  page.setDefaultTimeout(60000);

  console.log(`2) opening Stripe Checkout (${HEADED ? "headed" : "headless"})`);
  await page.goto(data.url, { waitUntil: "domcontentloaded" });
  await page.waitForSelector('input[name="email"]');
  await page.waitForTimeout(3000);

  await clickCardRow(page);
  await page.waitForTimeout(1500);

  await page.locator('input[name="email"]').fill(`buyer-${Date.now().toString(36)}@oneofone.test`);

  // expand manual address entry to reveal city/state/zip fields
  const manual = page.locator('button:has-text("Enter address manually"), a:has-text("Enter address manually")').first();
  if (await manual.count()) {
    await manual.click().catch(() => {});
    await page.waitForTimeout(800);
  }

  console.log("   looking for card fields...");
  // Stripe Checkout (current) renders card inputs directly on the page after expanding the Card row
  let cardOk = false;
  for (let i = 0; i < 20 && !cardOk; i++) {
    const num = page.locator('input[name="cardNumber"]').first();
    if (await num.count()) {
      await num.fill("4242424242424242");
      await page.locator('input[name="cardExpiry"]').fill("1234");
      await page.locator('input[name="cardCvc"]').fill("123");
      cardOk = true;
      break;
    }
    // fallback: classic Field-* inputs inside an iframe
    for (const f of page.frames()) {
      try {
        const n = f.locator("#Field-numberInput");
        if (await n.count()) {
          await n.fill("4242424242424242");
          await f.locator("#Field-expiryInput").fill("1234");
          await f.locator("#Field-cvcInput").fill("123");
          cardOk = true;
          break;
        }
      } catch {}
    }
    if (!cardOk) await page.waitForTimeout(700);
  }
  if (!cardOk) {
    await page.screenshot({ path: "/private/var/folders/mq/v8s9bp2x5gg6gvywwjfszb8r0000gn/T/opencode/e2e-nocard.png", fullPage: true });
    throw new Error("could not find card fields");
  }
  console.log("   card filled");

  const fill = async (name, value) => {
    const el = page.locator(`input[name="${name}"]`).first();
    if (await el.count()) { await el.fill(value); return true; }
    return false;
  };
  await fill("shippingName", "Test Buyer");
  await fill("shippingAddressLine1", "1 Infinite Loop");
  await fill("shippingLocality", "Cupertino");
  await fill("shippingPostalCode", "95014");
  // phone is required (we enabled phone collection); use a random number so
  // Stripe's well-known (201) 555-0123 test placeholder doesn't trigger Link OTP.
  await fill("phoneNumber", `415555${Math.floor(1000 + Math.random() * 9000)}`);
  try {
    const stateSel = page.locator('select[name="shippingAdministrativeArea"]');
    if (await stateSel.count()) await stateSel.selectOption("CA");
  } catch {}
  await fill("shippingAdministrativeArea", "CA");

  console.log("3) paying with test card 4242");
  // Uncheck the Link "save my info" box with a REAL click — leaving it checked
  // makes Checkout pop a Link OTP verification modal when Pay is clicked.
  try {
    const link = page.locator('input[name="enableStripePass"]');
    if (await link.count() && (await link.isChecked())) {
      await link.scrollIntoViewIfNeeded();
      await page.waitForTimeout(400);
      await link.click({ timeout: 5000 });
      await page.waitForTimeout(600);
    }
  } catch (e) {
    console.log("   (could not uncheck Link box:", e.message.split("\n")[0], ")");
  }

  let done = false;
  for (let attempt = 1; attempt <= 3 && !done; attempt++) {
    // handle Link "Confirm it's you" modal if it still appears (test code: 000000)
    try {
      const otp = page.locator('.Modal-Portal input[inputmode="numeric"], .Modal-Portal input[autocomplete="one-time-code"]').first();
      if (await otp.count() && await otp.isVisible()) {
        console.log(`   Link verification modal — entering 000000`);
        await otp.click({ force: true });
        await page.keyboard.type("000000", { delay: 60 });
        await page.waitForTimeout(2500);
      }
    } catch {}

    const pay = page.getByRole("button", { name: /^Pay( .*)?$/ }).last();
    await pay.click({ timeout: 15000 }).catch(async () => {
      await page.evaluate(() => {
        const btns = [...document.querySelectorAll('button[type="submit"]')];
        btns[btns.length - 1]?.click();
      });
    });

    try {
      await page.waitForURL(/\/success\?session_id=/, { timeout: 45000 });
      done = true;
    } catch {
      const bodyText = (await page.locator("body").innerText()).slice(0, 300);
      console.log(`   attempt ${attempt}: no redirect yet — ${bodyText.replace(/\n+/g, " | ").slice(0, 140)}`);
    }
  }
  if (!done) {
    await page.screenshot({ path: "/private/var/folders/mq/v8s9bp2x5gg6gvywwjfszb8r0000gn/T/opencode/e2e-stuck.png" });
    throw new Error("never redirected to success");
  }
  const successUrl = page.url();
  console.log(`   redirected: ${successUrl.slice(0, 100)}`);

  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1500);
  const text = await page.locator("body").innerText();
  await page.screenshot({ path: "/private/var/folders/mq/v8s9bp2x5gg6gvywwjfszb8r0000gn/T/opencode/e2e-success.png", fullPage: true });
  await browser.close();

  const paid = /\bpaid\b/i.test(text) && !/awaiting payment/i.test(text);
  const ordMatch = text.match(/ord_\d+/);
  console.log("5) success page shows Paid:", paid, "| prodigi order:", ordMatch?.[0] || "none yet");

  const sessionId = new URL(successUrl).searchParams.get("session_id");
  console.log(`   session_id=${sessionId}`);
  return { paid, orderId: ordMatch?.[0], sessionId };
}

main().then((r) => { console.log("RESULT", JSON.stringify(r)); process.exit(0); })
  .catch(async (e) => { console.error("E2E FAILED:", e.message); process.exit(1); });
