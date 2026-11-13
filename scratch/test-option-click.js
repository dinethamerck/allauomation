const { chromium } = require('playwright');
require('dotenv').config();

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: '.auth/user.json' });
  const page = await context.newPage();

  await page.goto('https://qa_pg.amerck.care/admin/prescription', { waitUntil: 'domcontentloaded' });
  const searchInput = page.getByPlaceholder(/Search by name, NIC or mobile number/i);
  await searchInput.waitFor({ state: 'visible' });
  await searchInput.fill('0764981884');

  const option = page.locator('[role="option"]').first();
  console.log('Waiting for [role="option"]...');
  await option.waitFor({ state: 'visible', timeout: 10000 });
  console.log('Option text:', await option.innerText());

  // Click option
  await option.click();
  await page.waitForTimeout(2000);

  // Check if Generic/Brand header is visible
  const medHeader = page.locator('text=/Generic\\/Brand/i').first();
  console.log('Med header visible:', await medHeader.isVisible());

  await browser.close();
})();
