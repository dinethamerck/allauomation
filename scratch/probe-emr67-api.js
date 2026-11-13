// scratch/probe-emr67-api.js — backend validation probe for children counts (restores data afterwards)
require('dotenv').config();
const { chromium, request } = require('@playwright/test');
const BASE = (process.env.BASE_URL || '').replace(/\/+$/, '');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: '.auth/user.json', baseURL: BASE });
  const page = await context.newPage();
  let auth = null;
  let getUrl = null;
  page.on('request', (r) => {
    if (r.url().includes('stg_api') && r.headers().authorization) auth = r.headers().authorization;
    if (r.url().includes('/admissions/form/') && r.method() === 'GET') getUrl = r.url();
  });
  await page.goto('/admin/admissions/onboarding/222?step=7', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  console.log('auth header present:', !!auth, auth && auth.slice(0, 12), 'GET url:', getUrl);
  await browser.close();

  const api = await request.newContext({ extraHTTPHeaders: { authorization: auth, 'content-type': 'application/json' } });
  const url = 'https://stg_api.amerck.care/admissions/form/222';
  const g = await api.get(url);
  console.log('GET', g.status());
  const original = (await g.json()).payload;
  console.log('keys:', Object.keys(original), 'version', original.version, 'status', original.status);
  const d0 = original.data;
  const base = { currentStep: 7, version: original.version, status: original.status || 'draft' };
  const send = async (label, patch) => {
    const r = await api.put(url, { data: { ...base, data: { ...d0, ...patch } } });
    const txt = await r.text();
    const saved = r.ok() ? JSON.parse(txt).payload?.data : null;
    console.log(label.padEnd(28), r.status(), saved ? JSON.stringify({ m: saved.dependentChildrenMale, f: saved.dependentChildrenFemale, c: saved.dependentChildrenCount }) : txt.slice(0, 200));
  };
  await send('decimal string "1.5"', { dependentChildrenMale: '1.5' });
  await send('decimal number 2.5', { dependentChildrenMale: 2.5 });
  await send('negative "-2"', { dependentChildrenMale: '-2' });
  await send('negative number -2', { dependentChildrenMale: -2 });
  await send('text "abc"', { dependentChildrenMale: 'abc' });
  await send('huge 99999', { dependentChildrenMale: '99999' });
  await send('count mismatch', { dependentChildrenMale: '1', dependentChildrenFemale: '1', dependentChildrenCount: '7' });
  await send('valid "2"', { dependentChildrenMale: '2' });

  // restore clean values
  const clean = { dependentChildrenMale: '', dependentChildrenFemale: '', dependentChildrenCount: '', independentChildrenMale: '', independentChildrenFemale: '', independentChildrenCount: '' };
  await send('RESTORE', clean);
  await api.dispose();
})();
