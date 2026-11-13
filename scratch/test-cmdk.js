const { chromium } = require('playwright');
require('dotenv').config();

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: '.auth/user.json' });
  const page = await context.newPage();

  await page.goto('https://qa_pg.amerck.care/admin/prescription', { waitUntil: 'networkidle' });
  const searchInput = page.locator('input[placeholder*="Search by name, NIC or mobile number"]').first();
  await searchInput.fill('0764981884');
  await page.waitForTimeout(1000);

  // Press ArrowDown and Enter
  console.log('Pressing ArrowDown and Enter...');
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(500);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(3000);

  console.log('Patient card visible:', await page.locator('text=/Dilumi Abeysekara/i').first().isVisible());
  await page.screenshot({ path: 'scratch/cmdk-selected.png' });

  await browser.close();
})();
