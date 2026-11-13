const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: 'playwright/.auth/user.json' });
  const page = await context.newPage();

  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('https://qa_care.amerck.com/admin/settings', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);

  const text = await page.evaluate(() => document.body.innerText);
  console.log('Body text on 375x667:\n', text.slice(0, 500));

  await browser.close();
})();
