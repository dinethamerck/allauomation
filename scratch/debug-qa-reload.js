require('dotenv').config();
const { chromium } = require('@playwright/test');
const { SocialHistoryPage } = require('../pages/SocialHistoryPage');
const BASE = (process.env.BASE_URL || '').replace(/\/+$/, '');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext({ storageState: '.auth/user.json', baseURL: BASE, viewport: { width: 1440, height: 900 } })).newPage();
  const sh = new SocialHistoryPage(page);
  await sh.goto();
  const before = await sh.apiGetForm();
  await sh.primeAutosave();
  const saved = await sh.enterAndCaptureSave([['Dependent', 'Male', '2'], ['Dependent', 'Female', '1']]);
  console.log('saved', saved?.dependentChildrenMale, saved?.dependentChildrenFemale, '| server', (await sh.apiGetForm()).data.dependentChildrenMale);
  const t0 = Date.now();
  await sh.reloadAndReopen();
  for (let i = 0; i < 12; i++) {
    console.log(((Date.now() - t0) / 1000).toFixed(1) + 's', 'UI male=', JSON.stringify(await sh.getChildren('Dependent', 'Male')), 'url', page.url().split('/').pop());
    await page.waitForTimeout(1000);
  }
  await page.close();
  await sh.apiPutForm(before.data, before);
  await browser.close();
})();
