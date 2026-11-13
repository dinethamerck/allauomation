require('dotenv').config();
const { chromium } = require('@playwright/test');
const globalSetup = require('../global-setup');
const { SocialHistoryPage } = require('../pages/SocialHistoryPage');
const BASE = (process.env.BASE_URL || '').replace(/\/+$/, '');
(async () => {
  await globalSetup();
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext({ storageState: '.auth/user.json', baseURL: BASE, viewport: { width: 1440, height: 900 } })).newPage();
  const sh = new SocialHistoryPage(page);
  await sh.goto();
  console.log('wizard:', page.url(), '| admissionId', sh.admissionId, '| api', sh.api.origin);
  const form = await sh.apiGetForm();
  console.log('server children:', SocialHistoryPage.FIELDS.map((f) => `${f.key}=${JSON.stringify(form.data?.[f.key])}`).join(' '));
  const i = sh.childrenInput('Dependent', 'Male');
  console.log('attrs:', await i.evaluate((e) => ({ type: e.type, min: e.min, step: e.step, inputMode: e.inputMode, pattern: e.pattern })));
  for (const v of ['1.5', '0.5', '2.0', '1,5', '-1', '1e2', '3']) {
    await sh.typeChildren('Dependent', 'Male', v);
    console.log('typed', JSON.stringify(v).padEnd(6), '->', JSON.stringify(await i.inputValue()), 'errors:', JSON.stringify((await sh.validationErrors.allInnerTexts()).filter(Boolean)));
  }
  await sh.pasteChildren('Dependent', 'Female', '2.75').catch((e) => console.log('paste err', e.message.split('\n')[0]));
  console.log('pasted "2.75" ->', JSON.stringify(await sh.getChildren('Dependent', 'Female')));
  await page.screenshot({ path: 'scratch/emr67-qa-preflight.png' });
  // put back whatever the server had before (typing may have autosaved)
  await page.close();
  const api = await (await browser.newContext()).request;
  const r = await api.put(`${sh.api.origin}/admissions/form/${sh.admissionId}`, { headers: { authorization: sh.api.auth, 'content-type': 'application/json' }, data: { currentStep: form.current_step ?? 7, data: form.data, version: form.version ?? 1, status: form.status ?? 'draft' } });
  console.log('restored:', r.status());
  await browser.close();
})();
