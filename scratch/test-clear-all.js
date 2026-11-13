const { chromium } = require('playwright');
require('dotenv').config();

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: '.auth/user.json' });
  const page = await context.newPage();

  await page.goto('https://qa_pg.amerck.care/admin/prescription', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  // Click Clear All if visible
  const clearAll = page.getByRole('button', { name: /Clear All/i });
  console.log('Clear All visible:', await clearAll.isVisible());
  if (await clearAll.isVisible()) {
    await clearAll.click();
    await page.waitForTimeout(1000);
  }

  // Count remove taper buttons
  const removeCount = await page.locator('button[aria-label*="Remove taper" i]').count();
  console.log('Remove taper buttons after Clear All:', removeCount);

  // Click Add taper step
  const addTaperBtn = page.locator('button[aria-label*="Add taper step" i]').first();
  await addTaperBtn.click();
  await page.waitForTimeout(1000);

  const removeCountAfter = await page.locator('button[aria-label*="Remove taper" i]').count();
  console.log('Remove taper buttons after click:', removeCountAfter);

  await browser.close();
})();
