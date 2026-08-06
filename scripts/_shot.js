const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  // Login on prod
  await page.goto("https://homebase-seven-lac.vercel.app/login", { waitUntil: "networkidle" });
  await page.fill("#email", "demo@homebase.app");
  await page.fill("#password", "demo123456");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 15000 });

  // Overview of Colleyville Home (has a mortgage portal -> pay + confirm buttons)
  await page.goto("https://homebase-seven-lac.vercel.app/properties/2600be59-f2c8-4bd7-8ed7-8f19de84c5be", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);

  await page.screenshot({ path: "overview-full.png", fullPage: true });
  // Zoom into Quick Actions
  const quick = page.locator("text=Quick Actions");
  await quick.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  const box = await quick.locator("xpath=ancestor::div[2]").boundingBox();
  if (box) await page.screenshot({ path: "overview-quick.png", clip: { x: box.x - 20, y: box.y - 20, width: 900, height: 200 } });

  await browser.close();
  console.log("screenshots saved");
})();
