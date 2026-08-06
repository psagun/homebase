const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto("https://homebase-seven-lac.vercel.app/login", { waitUntil: "networkidle" });
  await page.fill("#email", "demo@homebase.app");
  await page.fill("#password", "demo123456");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 15000 });

  await page.goto("https://homebase-seven-lac.vercel.app/properties/2600be59-f2c8-4bd7-8ed7-8f19de84c5be", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);

  const quick = page.locator("text=Quick Actions");
  await quick.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);

  // Every clickable element inside the Quick Actions section
  const buttons = await quick.locator("xpath=ancestor::div[2]").locator("a, button").evaluateAll((els) =>
    els.map((el) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        text: el.textContent.trim().slice(0, 40),
        href: el.getAttribute("href"),
        x: Math.round(r.x), y: Math.round(r.y),
        w: Math.round(r.width), h: Math.round(r.height),
        bg: cs.backgroundColor, color: cs.color,
        display: cs.display,
      };
    })
  );
  console.log(JSON.stringify(buttons, null, 2));

  // Also the summary cards above it for context
  const cards = await page.locator("text=Quick Summary").locator("xpath=ancestor::div[2]").locator("div").evaluateAll((els) =>
    els.filter((el) => el.textContent && /Rent|Mortgage|Insurance|Tax/i.test(el.textContent) && el.children.length < 6)
      .slice(0, 8)
      .map((el) => {
        const r = el.getBoundingClientRect();
        return { text: el.textContent.trim().slice(0, 60), x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
      })
  );
  console.log("CARDS:", JSON.stringify(cards.slice(0, 8), null, 2));

  await browser.close();
})();
