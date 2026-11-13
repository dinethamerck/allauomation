require('dotenv').config();
const { chromium } = require('@playwright/test');
const { SocialHistoryPage } = require('../pages/SocialHistoryPage');
const BASE = (process.env.BASE_URL || '').replace(/\/+$/, '');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ storageState: '.auth/user.json', baseURL: BASE, viewport: { width: 1440, height: 900 } });
  let page = await ctx.newPage();
  let sh = new SocialHistoryPage(page);
  await sh.goto();
  const original = await sh.apiGetForm();
  console.log('API', sh.api.origin, 'draft', sh.admissionId);
  const i = sh.childrenInput('Dependent', 'Male');
  const errs = async () => (await sh.validationErrors.allInnerTexts()).filter((t) => t.trim());
  console.log('== TYPED');
  for (const v of ['1.5', '0.5', '2.0', '.5', '1.', '1,5', '-1', '1e2', '+2', '007', '12']) {
    await sh.typeChildren('Dependent', 'Male', v);
    console.log(' ', JSON.stringify(v).padEnd(7), '->', JSON.stringify(await i.inputValue()), 'errors', JSON.stringify(await errs()));
  }
  console.log('== PASTED (fill)');
  for (const v of ['2.75', '0.5', '-3', '2.0', '1e2']) {
    await sh.typeChildren('Dependent', 'Male', '');
    await i.fill(v).catch((e) => console.log('  fill error', e.message.split('\n')[0]));
    await page.waitForTimeout(300);
    console.log(' ', JSON.stringify(v).padEnd(7), '->', JSON.stringify(await i.inputValue()), 'errors', JSON.stringify(await errs()));
  }
  console.log('== CLIPBOARD paste');
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: BASE });
  for (const v of ['1.5', '3,5', 'abc']) {
    await page.evaluate((t) => navigator.clipboard.writeText(t), v);
    await sh.typeChildren('Dependent', 'Male', '');
    await page.keyboard.press('Control+V');
    await page.waitForTimeout(300);
    console.log(' ', JSON.stringify(v).padEnd(7), '->', JSON.stringify(await i.inputValue()));
  }
  console.log('== SAVE payload for typed 1.5 / 2.0');
  await sh.primeAutosave();
  const saved = await sh.enterAndCaptureSave([['Dependent', 'Male', '1.5'], ['Dependent', 'Female', '2.0']]);
  console.log('  saved', saved && { m: saved.dependentChildrenMale, f: saved.dependentChildrenFemale, c: saved.dependentChildrenCount });
  await sh.openSummary();
  console.log('  summary', await sh.getSummaryChildrenText('Dependent'));
  await page.close();

  console.log('== BACKEND');
  page = await ctx.newPage(); sh = new SocialHistoryPage(page); await sh.goto();
  for (const [name, val] of [['"1.5"', '1.5'], ['2.5', 2.5], ['"-1"', '-1'], ['"abc"', 'abc'], ['"99999"', '99999'], ['"3"', '3']]) {
    const r = await sh.apiPutForm({ ...original.data, dependentChildrenMale: val }, original);
    const body = (await r.text()).slice(0, 160);
    const stored = (await sh.apiGetForm()).data.dependentChildrenMale;
    console.log(' ', name.padEnd(8), r.status(), 'stored', JSON.stringify(stored), r.ok() ? '' : body);
  }
  const r = await sh.apiPutForm(original.data, original);
  console.log('restore', r.status());
  await page.close();

  console.log('== OBS-01 first edit after open');
  page = await ctx.newPage(); sh = new SocialHistoryPage(page); await sh.goto();
  let puts = 0; page.on('request', (q) => { if (q.method() === 'PUT') puts++; });
  await sh.typeChildren('Dependent', 'Female', '3'); await page.waitForTimeout(3000);
  await sh.continueButton.click(); await page.waitForTimeout(5000);
  console.log('  PUTs', puts, 'server', JSON.stringify((await sh.apiGetForm()).data.dependentChildrenFemale));
  await page.close();
  page = await ctx.newPage(); sh = new SocialHistoryPage(page); await sh.goto();
  console.log('final restore', (await sh.apiPutForm(original.data, original)).status());
  await browser.close();
})();
