/* End-to-end purchase test: fills in the summoner, pays with a Stripe test
   card, and confirms the order page reports a Prodigi print order.
   Usage: node scripts/e2e.mjs <siteUrl> */
import puppeteer from "puppeteer-core";
import fs from "node:fs";

const SITE = process.argv[2] ?? "http://localhost:3000";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const shot = (n) => `/tmp/e2e-${n}.png`;

const log = (...a) => console.log("·", ...a);

async function typeInto(page, selector, value) {
  await page.waitForSelector(selector, { timeout: 30000 });
  await page.click(selector);
  await page.type(selector, value, { delay: 12 });
}

/** Stripe Checkout renders some inputs inside iframes on older layouts and
 *  inline on the current one. Try the page first, then every frame. */
async function fillAnywhere(page, selectors, value) {
  const targets = [page, ...page.frames()];
  for (const t of targets) {
    for (const sel of selectors) {
      const el = await t.$(sel).catch(() => null);
      if (el) {
        const visible = await el.boundingBox().catch(() => null);
        if (!visible) continue;
        await el.click({ clickCount: 3 }).catch(() => {});
        await el.type(value, { delay: 14 });
        return true;
      }
    }
  }
  return false;
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--window-size=1400,1100"],
  defaultViewport: { width: 1400, height: 1100 },
});

const page = await browser.newPage();
page.on("console", (m) => {
  if (m.type() === "error") console.log("  [browser error]", m.text().slice(0, 200));
});

try {
  log("opening", SITE);
  await page.goto(SITE, { waitUntil: "networkidle2", timeout: 90000 });

  log("filling the summoner");
  await typeInto(page, "#keeper", "Michael");
  await typeInto(page, "#place", "Brooklyn, NY");
  await typeInto(page, "#appetite", "unsent text messages");
  await page.evaluate(() => {
    const btns = [...document.querySelectorAll(".temp")];
    const feral = btns.find((b) => b.textContent.includes("Feral"));
    feral?.click();
  });
  await page.evaluate(() => {
    const sizes = [...document.querySelectorAll(".size")];
    sizes.find((s) => s.textContent.trim().startsWith("XL"))?.click();
  });
  await new Promise((r) => setTimeout(r, 900));
  await page.screenshot({ path: shot("1-summoner"), fullPage: false });

  const name = await page.$eval(".namecard h3", (el) => el.textContent);
  log("creature:", name);

  log("starting checkout");
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle2", timeout: 90000 }),
    page.evaluate(() => {
      const b = [...document.querySelectorAll("button")].find((x) =>
        x.textContent.includes("Print this creature")
      );
      b.click();
    }),
  ]);

  const checkoutUrl = page.url();
  log("landed on", checkoutUrl.slice(0, 70));
  if (!/checkout\.stripe\.com/.test(checkoutUrl)) {
    throw new Error(`expected Stripe Checkout, got ${checkoutUrl}`);
  }
  await new Promise((r) => setTimeout(r, 3500));
  await page.screenshot({ path: shot("2-checkout") });

  log("filling contact and shipping");
  await fillAnywhere(page, ["#email", 'input[name="email"]'], "cryptid-tester@example.com");
  await fillAnywhere(page, ["#shippingName", 'input[name="shippingName"]'], "Michael Tester");
  const manual = await page.$("#shippingAddressLine1");
  if (!manual) {
    // Autocomplete field: switch to manual entry if offered
    await page.evaluate(() => {
      const link = [...document.querySelectorAll("button, a")].find((b) =>
        /enter address manually/i.test(b.textContent)
      );
      link?.click();
    });
    await new Promise((r) => setTimeout(r, 800));
  }
  await fillAnywhere(
    page,
    ["#shippingAddressLine1", 'input[name="shippingAddressLine1"]'],
    "150 Court Street"
  );
  await fillAnywhere(
    page,
    ["#shippingLocality", 'input[name="shippingLocality"]'],
    "Brooklyn"
  );
  // Stripe re-renders this field as you type; verify and retry.
  for (let attempt = 0; attempt < 4; attempt++) {
    await fillAnywhere(page, ["#shippingPostalCode"], "11201");
    await new Promise((r) => setTimeout(r, 700));
    const got = await page
      .$eval("#shippingPostalCode", (el) => el.value)
      .catch(() => "");
    if (got === "11201") break;
    log(`  zip retry (saw "${got}")`);
  }
  const stateSel = await page.$("#shippingAdministrativeArea");
  if (stateSel) {
    await page.select("#shippingAdministrativeArea", "NY").catch(async () => {
      await stateSel.type("NY");
    });
  }
  await fillAnywhere(page, ["#phoneNumber", 'input[name="phoneNumber"]'], "2125551234");

  // Card fields only mount once the Card tab is selected.
  log("selecting card payment");
  await page.click("#payment-method-accordion-item-title-card");
  await new Promise((r) => setTimeout(r, 2500));

  log("filling card");
  await fillAnywhere(page, ["#cardNumber", 'input[name="cardNumber"]'], "4242424242424242");
  await fillAnywhere(page, ["#cardExpiry", 'input[name="cardExpiry"]'], "1230");
  await fillAnywhere(page, ["#cardCvc", 'input[name="cardCvc"]'], "123");
  await fillAnywhere(page, ["#billingName", 'input[name="billingName"]'], "Michael Tester");

  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: shot("3-filled"), fullPage: true });

  log("submitting payment");
  await page.evaluate(() => {
    const b =
      document.querySelector('button[data-testid="hosted-payment-submit-button"]') ||
      [...document.querySelectorAll("button")].find((x) => /pay|order/i.test(x.textContent));
    b?.click();
  });

  await page.waitForFunction(() => location.href.includes("/order/"), {
    timeout: 120000,
    polling: 800,
  });
  const orderUrl = page.url();
  log("redirected to", orderUrl);

  await page.goto(orderUrl, { waitUntil: "networkidle2", timeout: 90000 });
  await new Promise((r) => setTimeout(r, 1500));
  await page.screenshot({ path: shot("4-order"), fullPage: true });

  const summary = await page.evaluate(() => document.body.innerText);
  fs.writeFileSync("/tmp/e2e-order.txt", summary);
  const prodigiId = summary.match(/ord_\d+/i)?.[0];
  console.log("\n=== RESULT ===");
  console.log("order page:", orderUrl);
  console.log("prodigi order:", prodigiId ?? "NOT FOUND");
  console.log(summary.split("\n").slice(0, 40).join("\n"));
  if (!prodigiId) process.exitCode = 1;
} catch (err) {
  console.error("E2E FAILED:", err.message);
  await page.screenshot({ path: shot("fail") }).catch(() => {});
  console.error("url at failure:", page.url());
  process.exitCode = 1;
} finally {
  await browser.close();
}
