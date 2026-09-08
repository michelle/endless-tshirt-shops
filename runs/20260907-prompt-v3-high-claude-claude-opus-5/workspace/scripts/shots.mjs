import puppeteer from "puppeteer-core";
const SITE = process.argv[2];
const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", args:["--no-sandbox"] });

// desktop: plate close-up view
const p = await b.newPage();
await p.setViewport({width:1440,height:1200});
await p.goto(SITE, {waitUntil:"networkidle2"});
await p.type("#keeper","Priya"); await p.type("#place","Bangalore"); await p.type("#appetite","browser tabs");
await p.evaluate(()=>[...document.querySelectorAll(".temp")].find(x=>x.textContent.includes("Devoted"))?.click());
await p.evaluate(()=>[...document.querySelectorAll(".swatch")].at(-2)?.click());
await p.evaluate(()=>[...document.querySelectorAll(".viewtabs button")].at(-1)?.click());
await new Promise(r=>setTimeout(r,1200));
await p.evaluate(()=>document.querySelector("#summon").scrollIntoView());
await new Promise(r=>setTimeout(r,600));
await p.screenshot({path:"/tmp/s-plateview.png"});

// mobile
const m = await b.newPage();
await m.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
await m.goto(SITE, {waitUntil:"networkidle2"});
await m.type("#keeper","Wes"); await m.type("#place","Marfa, Texas"); await m.type("#appetite","cold pizza at 3am");
await new Promise(r=>setTimeout(r,1200));
await m.screenshot({path:"/tmp/s-mobile-top.png"});
await m.evaluate(()=>document.querySelector("#summon").scrollIntoView());
await new Promise(r=>setTimeout(r,500));
await m.screenshot({path:"/tmp/s-mobile-form.png"});
console.log("ok");
await b.close();
