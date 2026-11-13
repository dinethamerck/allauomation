require('dotenv').config();
const { chromium } = require('@playwright/test');
const { SocialHistoryPage } = require('../pages/SocialHistoryPage');
const BASE = (process.env.BASE_URL || '').replace(/\/+$/, '');
(async () => {
  const browser = await chromium.launch({ headless: true });
  for (const trial of [1, 2]) {
    const page = await (await browser.newContext({ storageState: '.auth/user.json', baseURL: BASE, viewport: { width: 1440, height: 900 } })).newPage();
    let puts = 0; page.on('request', (r) => { if (r.method() === 'PUT') puts++; });
    const sh = new SocialHistoryPage(page);
    await sh.goto();
    await sh.typeChildren('Dependent', 'Female', '3');
    await page.waitForTimeout(3000);
    await sh.continueButton.click();
    await page.waitForTimeout(8000);
    const server = (await sh.apiGetForm()).data.dependentChildrenFemale;
    await sh.reloadAndReopen();
    console.log(`trial ${trial}: PUTs=${puts} server=${JSON.stringify(server)} after reload UI=${JSON.stringify(await sh.getChildren('Dependent', 'Female'))}`);
    await page.close();
  }
  await browser.close();
})();
