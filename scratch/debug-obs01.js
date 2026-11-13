require('dotenv').config();
const { chromium } = require('@playwright/test');
const { SocialHistoryPage } = require('../pages/SocialHistoryPage');
const BASE = (process.env.BASE_URL || '').replace(/\/+$/, '');
(async () => {
  const browser = await chromium.launch({ headless: true });
  for (const [label, waitForData] of [['fast user', false], ['fast user', false], ['fast user', false], ['waits for load', true]]) {
    const page = await (await browser.newContext({ storageState: '.auth/user.json', baseURL: BASE, viewport: { width: 1440, height: 900 } })).newPage();
    let puts = 0; page.on('request', (r) => { if (r.method() === 'PUT') puts++; });
    const sh = new SocialHistoryPage(page);
    await sh.goto({ waitForData });
    const before = await sh.apiGetForm();
    await sh.typeChildren('Dependent', 'Female', '3');
    const typed = await sh.getChildren('Dependent', 'Female');
    await page.waitForTimeout(3000);
    const shown = await sh.getChildren('Dependent', 'Female');
    await sh.continueButton.click(); await page.waitForTimeout(5000);
    const server = (await sh.apiGetForm()).data.dependentChildrenFemale;
    console.log(`${label.padEnd(15)} typed=${typed} shown_after_3s=${JSON.stringify(shown)} PUTs=${puts} server=${JSON.stringify(server)}`);
    await page.close();
    // restore
    const p2 = await (await browser.newContext({ storageState: '.auth/user.json', baseURL: BASE })).newPage();
    const s2 = new SocialHistoryPage(p2); await s2.goto().catch(() => s2.goto());
    await s2.apiPutForm({ ...before.data, dependentChildrenFemale: '', dependentChildrenCount: '' }, before);
    await p2.close();
  }
  await browser.close();
})();
