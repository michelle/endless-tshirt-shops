import { chromium } from "playwright";
const U = process.env.U;
const b = await chromium.launch();
for (const [name, vp] of [["desk", { width: 1360, height: 900 }], ["mobile", { width: 390, height: 844 }]]) {
  const p = await b.newPage({ viewport: vp, deviceScaleFactor: 1 });
  await p.goto(U + "/"); await p.waitForTimeout(800);
  await p.screenshot({ path: `shots/${name}-home.png`, fullPage: true });
  await p.goto(U + "/design"); await p.waitForTimeout(800);
  await p.screenshot({ path: `shots/${name}-design.png` });
  await p.mouse.wheel(0, 1400); await p.waitForTimeout(400);
  await p.screenshot({ path: `shots/${name}-design-scrolled.png` });
  await p.getByRole("button", { name: "Add to bag" }).click();
  await p.goto(U + "/cart"); await p.waitForTimeout(600);
  await p.screenshot({ path: `shots/${name}-cart.png`, fullPage: true });
}
await b.close();
