require('dotenv').config();
const { chromium } = require('@playwright/test');
const { SocialHistoryPage } = require('../pages/SocialHistoryPage');
const BASE = (process.env.BASE_URL || '').replace(/\/+$/, '');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext({ storageState: '.auth/user.json', baseURL: BASE, viewport: { width: 1440, height: 900 } })).newPage();
  const sh = new SocialHistoryPage(page);
  await sh.goto();
  const i = sh.childrenInput('Dependent', 'Male');
  console.log('attrs:', await i.evaluate((e) => ({ type: e.type, min: e.min, step: e.step, inputMode: e.inputMode, pattern: e.pattern })));
  for (const v of ['1.5', '0.5', '2.0', '1,5', '-1', '1e2', '3']) {
    await sh.typeChildren('Dependent', 'Male', v);
    console.log('typed', JSON.stringify(v).padEnd(6), '->', JSON.stringify(await i.inputValue()), 'errors:', JSON.stringify((await sh.validationErrors.allInnerTexts()).filter(Boolean)));
  }
  await sh.pasteChildren('Dependent', 'Female', '2.75').catch((e) => console.log('paste err', e.message.split('\n')[0]));
  console.log('pasted "2.75" ->', JSON.stringify(await sh.getChildren('Dependent', 'Female')));
  await page.close(); await browser.close();
})();
