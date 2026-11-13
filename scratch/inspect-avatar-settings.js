const { chromium } = require('playwright');
require('dotenv').config();

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: '.auth/user.json' });
  const page = await context.newPage();

  await page.goto('https://qa_pg.amerck.care/admin', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  // Click on "Janitha Rasadun's Practice"
  console.log('Clicking practice selector...');
  const practiceBtn = page.getByText("Janitha Rasadun's Practice").first();
  if (await practiceBtn.isVisible()) {
    await practiceBtn.click();
    await page.waitForTimeout(1000);
    const pop1 = await page.$$eval('div[role="menu"] *, .popover *, .dropdown *', els => els.map(e => e.innerText.trim()).filter(Boolean));
    console.log('Practice popover items:', [...new Set(pop1)]);
    await page.screenshot({ path: 'scratch/practice-popover.png' });
  }

  // Click on "JR"
  console.log('Clicking JR avatar...');
  const jrBtn = page.getByText('JR', { exact: true }).first();
  if (await jrBtn.isVisible()) {
    await jrBtn.click();
    await page.waitForTimeout(1000);
    const pop2 = await page.$$eval('div[role="menu"] *, div[class*="menu"] *, div[class*="popover"] *, [role="tooltip"] *', els => els.map(e => e.innerText.trim()).filter(Boolean));
    console.log('JR avatar popover items:', [...new Set(pop2)]);
    await page.screenshot({ path: 'scratch/jr-popover.png' });
  }

  // Check Settings / Organizations to see if Preferences or Account Management is there
  console.log('Checking /admin/settings/organizations...');
  await page.goto('https://qa_pg.amerck.care/admin/settings/organizations', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  const orgText = await page.$$eval('a, button, h1, h2, h3, h4, span, label', els => els.map(e => e.innerText.trim()).filter(x => /preference|account|taper|medication/i.test(x)));
  console.log('Org page keywords:', orgText);
  await page.screenshot({ path: 'scratch/org-page.png' });

  // Also check /admin/settings/roles
  console.log('Checking /admin/settings/roles...');
  await page.goto('https://qa_pg.amerck.care/admin/settings/roles', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  const rolesText = await page.$$eval('a, button, h1, h2, h3, h4, span, td', els => els.map(e => e.innerText.trim()).filter(Boolean));
  console.log('Roles page elements:', rolesText.slice(0, 30));
  await page.screenshot({ path: 'scratch/roles-page.png' });

  await browser.close();
})();
