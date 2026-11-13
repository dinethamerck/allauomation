const { chromium } = require('playwright');
require('dotenv').config();

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: '.auth/user.json' });
  const page = await context.newPage();

  console.log('Navigating to /admin...');
  await page.goto('https://qa_pg.amerck.care/admin', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  // 1. Check clicking the "JR" avatar button
  const jrBtn = page.locator('button:has-text("JR"), header button').last();
  if (await jrBtn.isVisible()) {
    console.log('Clicking user menu JR...');
    await jrBtn.click();
    await page.waitForTimeout(1000);
    const popupLinks = await page.$$eval('a, [role="menuitem"], div[role="menu"] *', els => els.map(e => ({ text: e.innerText.trim(), href: e.href || '' })).filter(x => x.text));
    console.log('User dropdown items:', popupLinks);
    await page.screenshot({ path: 'scratch/user-dropdown.png' });
  }

  // 2. Check /admin/settings
  console.log('Navigating to /admin/settings...');
  await page.goto('https://qa_pg.amerck.care/admin/settings', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  console.log('Settings page URL:', page.url());
  const settingsLinks = await page.$$eval('a, button, [role="tab"]', els => els.map(e => ({ text: e.innerText.trim().replace(/\n+/g, ' '), href: e.href || '' })).filter(x => x.text));
  console.log('Settings elements:', settingsLinks);
  await page.screenshot({ path: 'scratch/settings-page.png' });

  // 3. Check Drug Cabinet Presets (/admin/drugs)
  console.log('Navigating to /admin/drugs...');
  await page.goto('https://qa_pg.amerck.care/admin/drugs', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  console.log('Drugs page URL:', page.url());
  const drugsTabs = await page.$$eval('a, button, [role="tab"]', els => els.map(e => ({ text: e.innerText.trim().replace(/\n+/g, ' '), href: e.href || '' })).filter(x => x.text));
  console.log('Drugs tabs/buttons:', drugsTabs.filter(x => /preset|drug|cabinet/i.test(x.text)));
  await page.screenshot({ path: 'scratch/drugs-page.png' });

  // 4. Check Care View (/admin/prescription)
  console.log('Navigating to /admin/prescription...');
  await page.goto('https://qa_pg.amerck.care/admin/prescription', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  console.log('Care View URL:', page.url());
  const careTabs = await page.$$eval('a, button, [role="tab"], th', els => els.map(e => ({ text: e.innerText.trim().replace(/\n+/g, ' '), href: e.href || '' })).filter(x => x.text));
  console.log('Care View tabs/headers:', careTabs);
  await page.screenshot({ path: 'scratch/care-view.png' });

  await browser.close();
})();
