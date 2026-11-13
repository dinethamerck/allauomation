const { chromium } = require('playwright');
require('dotenv').config();

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: '.auth/user.json' });
  const page = await context.newPage();

  await page.goto('https://qa_pg.amerck.care/admin/account', { waitUntil: 'networkidle' });
  const prefTab = page.locator('button, div').filter({ hasText: /^Preferences/ }).first();
  await prefTab.click();
  await page.waitForTimeout(1000);

  const taperLabel = page.getByText('Tapering Prescriptions').first();
  await taperLabel.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);

  // The switch is either preceding or following the label in DOM
  const taperSwitch = page.locator('button[role="switch"]').last();
  console.log('Taper switch visible:', await taperSwitch.isVisible());
  console.log('Taper switch checked:', await taperSwitch.getAttribute('aria-checked'));

  await taperSwitch.click();
  await page.waitForTimeout(1000);
  console.log('After click checked:', await taperSwitch.getAttribute('aria-checked'));

  await page.screenshot({ path: 'scratch/taper-toggled.png' });
  await browser.close();
})();
