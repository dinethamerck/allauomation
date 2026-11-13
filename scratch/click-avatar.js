const { chromium } = require('playwright');
require('dotenv').config();

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: '.auth/user.json' });
  const page = await context.newPage();

  await page.goto('https://qa_pg.amerck.care/admin/settings', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Look for the JR button
  const jr = page.locator('header, nav, [class*="header"]').locator('button, div').filter({ hasText: /^JR$/ }).first();
  console.log('JR exists:', await jr.count());
  if (await jr.count() > 0) {
    await jr.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'scratch/clicked-jr.png' });
    const allText = await page.locator('body').innerText();
    console.log('Text on page after JR click:', allText.split('\n').filter(Boolean));
  }

  // Also check the button next to JR with the icon
  const sparkleBtn = page.locator('header button, div button').nth(-2);
  if (await sparkleBtn.isVisible()) {
    await sparkleBtn.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'scratch/clicked-sparkle.png' });
  }

  await browser.close();
})();
