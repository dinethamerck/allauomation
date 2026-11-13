const { chromium } = require('playwright');
require('dotenv').config();

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: '.auth/user.json' });
  const page = await context.newPage();

  await page.goto('https://qa_pg.amerck.care/admin', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  // Click JR
  const jr = page.locator('header, nav, [class*="header"]').locator('button, div').filter({ hasText: /^JR$/ }).first();
  await jr.click();
  await page.waitForTimeout(1000);

  // Click Account Management
  const accMgmt = page.getByText('Account Management').first();
  console.log('Clicking Account Management...');
  await accMgmt.click();
  await page.waitForTimeout(3000);

  console.log('URL after clicking Account Management:', page.url());
  await page.screenshot({ path: 'scratch/account-management.png' });

  // Get all text and tabs on the page
  const text = await page.locator('body').innerText();
  console.log('Account management page text:', text.split('\n').filter(Boolean));

  // Find any tabs or links
  const tabs = await page.$$eval('[role="tab"], a, button', els => els.map(e => ({ text: e.innerText.trim(), href: e.href || '' })).filter(x => x.text));
  console.log('Tabs / actions on page:', tabs);

  await browser.close();
})();
