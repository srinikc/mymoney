const { chromium } = require("playwright");
const path = require("node:path");
const WAV = path.join(process.env.TEMP, "hey_mymoney.wav");
(async () => {
  const browser = await chromium.launch({ headless: true, args: ["--use-fake-ui-for-media-stream","--use-fake-device-for-media-stream",`--use-file-for-fake-audio-capture=${WAV}`,"--autoplay-policy=no-user-gesture-required"] });
  const ctx = await browser.newContext({ permissions: ["microphone"] });
  const page = await ctx.newPage();
  const errs=[]; page.on("pageerror",e=>errs.push(e.message));
  await page.goto("http://localhost:3005/login", { waitUntil: "networkidle" });
  await page.fill('input[name="email"], input[type="email"]', "test@example.com");
  await page.fill('input[type="password"]', "test123");
  await page.click('button[type="submit"], form button');
  await page.waitForURL("**/", { timeout: 30000 }).catch(()=>{});
  await page.waitForTimeout(1500);
  const skip = page.locator("button:has-text('Skip')"); if (await skip.count()) await skip.first().click();
  const before = await page.evaluate(async () => (await (await fetch("/api/admin/wake-word")).json()));
  console.log("current phrase:", JSON.stringify(before));
  await page.reload({ waitUntil: "load" }); await page.waitForTimeout(1500);
  const enable = page.locator("button[title*='Enable wake word']").first();
  await enable.waitFor({ timeout: 30000 }); const t0=Date.now(); await enable.click();
  await page.locator("button[title*='Wake word active']").first().waitFor({ timeout: 120000 });
  console.log("wake word active after", ((Date.now()-t0)/1000).toFixed(1), "s");
  let detected=false; const t1=Date.now();
  while (Date.now()-t1 < 60000) { if (await page.getByRole("heading",{name:"MyMoney Assistant"}).count() > 0) { detected=true; break; } await page.waitForTimeout(1000); }
  console.log("DETECTED 'Hey MyMoney':", detected, "| errors:", JSON.stringify(errs));
  await browser.close();
  process.exit(detected?0:2);
})().catch(e=>{ console.error("FATAL", e); process.exit(1); });
