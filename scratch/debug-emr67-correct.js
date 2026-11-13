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
  let m = sh.markSave(); await i.click(); await page.keyboard.type('2'); console.log('typed 2, saved:', (await sh.waitForSave(m))?.dependentChildrenMale);
  // user corrects: select all + Backspace, then types 3
  await i.click(); await page.keyboard.press('Control+a'); await page.keyboard.press('Backspace');
  console.log('after Backspace:', JSON.stringify(await i.inputValue()));
  await page.waitForTimeout(500);
  m = sh.markSave(); await page.keyboard.type('3');
  console.log('after typing 3:', JSON.stringify(await i.inputValue()), 'saved:', (await sh.waitForSave(m))?.dependentChildrenMale);
  // user clears completely and leaves it empty
  await page.keyboard.press('Control+a'); await page.keyboard.press('Backspace'); await page.keyboard.press('Tab');
  await page.waitForTimeout(3000);
  await sh.reloadAndReopen();
  console.log('cleared then reload ->', JSON.stringify(await sh.getChildren('Dependent', 'Male')), 'server:', (await sh.apiGetForm()).data.dependentChildrenMale);
  await page.close(); await browser.close();
})();
