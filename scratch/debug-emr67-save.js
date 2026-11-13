require('dotenv').config();
const { chromium } = require('@playwright/test');
const { SocialHistoryPage } = require('../pages/SocialHistoryPage');
const BASE = (process.env.BASE_URL || '').replace(/\/+$/, '');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext({ storageState: '.auth/user.json', baseURL: BASE, viewport: { width: 1440, height: 900 } })).newPage();
  const log = (...a) => console.log(new Date().toISOString().slice(17, 23), ...a);
  page.on('request', (r) => { if (r.method() !== 'GET' && !/google|cdn-cgi/.test(r.url())) log('  REQ', r.method(), r.url(), (r.postData() || '').match(/"dependentChildren\w+":"[^"]*"/g)); });
  const sh = new SocialHistoryPage(page);
  await sh.goto();
  const vals = async () => Promise.all(SocialHistoryPage.FIELDS.map((f) => sh.getChildren(f.group, f.gender)));
  log('initial', await vals(), 'server:', JSON.stringify((await sh.apiGetForm()).data).match(/"dependentChildren\w+":"[^"]*"/g));

  log('--- scenario 1: type Male=2 then Continue immediately');
  await sh.typeChildren('Dependent', 'Male', '2');
  await sh.continueButton.click(); await page.waitForTimeout(5000);
  log('server:', JSON.stringify((await sh.apiGetForm()).data).match(/"dependentChildren\w+":"[^"]*"/g));
  await sh.openSocialHistory(); log('UI after return', await vals());

  log('--- scenario 2: type Female=3, Tab (blur), wait 3s, Continue');
  await sh.typeChildren('Dependent', 'Female', '3'); await page.keyboard.press('Tab'); await page.waitForTimeout(3000);
  await sh.continueButton.click(); await page.waitForTimeout(5000);
  log('server:', JSON.stringify((await sh.apiGetForm()).data).match(/"dependentChildren\w+":"[^"]*"/g));
  await sh.openSocialHistory(); log('UI after return', await vals());

  log('--- scenario 3: wait 35s idle (autosave?)');
  await sh.typeChildren('Independent', 'Male', '4');
  await page.waitForTimeout(35000);
  log('server:', JSON.stringify((await sh.apiGetForm()).data).match(/"\w*ndependentChildren\w+":"[^"]*"/g));
  await browser.close();
})();
