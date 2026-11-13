const { chromium } = require('playwright');
require('dotenv').config();

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: '.auth/user.json' });
  const page = await context.newPage();

  // Test Preferences navigation
  console.log('Testing Preferences navigation...');
  await page.goto('https://qa_pg.amerck.care/admin/account', { waitUntil: 'networkidle' });
  const prefTab = page.locator('button, div').filter({ hasText: /^Preferences/ }).first();
  await prefTab.click();
  await page.waitForTimeout(1000);

  const taperRow = page.locator('div').filter({ hasText: /Tapering Prescriptions/i }).last();
  const taperSwitch = taperRow.locator('button[role="switch"]').first();
  console.log('Taper switch found:', await taperSwitch.isVisible());
  console.log('Taper switch aria-checked:', await taperSwitch.getAttribute('aria-checked'));

  // Toggle OFF and ON
  await taperSwitch.click();
  await page.waitForTimeout(1000);
  console.log('Taper switch aria-checked after 1st click:', await taperSwitch.getAttribute('aria-checked'));

  await taperSwitch.click();
  await page.waitForTimeout(1000);
  console.log('Taper switch aria-checked after 2nd click:', await taperSwitch.getAttribute('aria-checked'));

  await browser.close();
  console.log('Preferences test successful!');
})();
