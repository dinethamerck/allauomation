const { chromium } = require('playwright');
require('dotenv').config();

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: '.auth/user.json' });
  const page = await context.newPage();

  console.log('Navigating to /admin/account...');
  await page.goto('https://qa_pg.amerck.care/admin/account', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Click on Preferences item in sidebar
  console.log('Clicking Preferences...');
  const prefBtn = page.locator('div, button, a').filter({ hasText: /^Preferences/ }).first();
  await prefBtn.click();
  await page.waitForTimeout(2000);

  console.log('URL after clicking Preferences:', page.url());
  await page.screenshot({ path: 'scratch/preferences-view.png' });

  // Get all text on the preferences view
  const text = await page.locator('body').innerText();
  console.log('Preferences page text:', text.split('\n').filter(Boolean));

  // Get all inputs, switches, checkboxes
  const inputs = await page.$$eval('input, button, select, label', els => els.map(e => ({
    tag: e.tagName,
    type: e.type || '',
    text: e.innerText?.trim() || '',
    id: e.id || '',
    name: e.name || '',
    checked: e.checked,
    ariaChecked: e.getAttribute('aria-checked'),
    role: e.getAttribute('role'),
    className: e.className
  })));
  console.log('Inputs/controls in preferences:', JSON.stringify(inputs.filter(x => /taper|switch|check|toggle|medication|preference/i.test(JSON.stringify(x))), null, 2));

  await browser.close();
})();
