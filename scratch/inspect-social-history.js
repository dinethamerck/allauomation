// scratch/inspect-social-history.js — explore the Social History step (EMR-67)
require('dotenv').config();
const { chromium } = require('@playwright/test');
const fs = require('fs');
const globalSetup = require('../global-setup');

const BASE = (process.env.BASE_URL || '').replace(/\/+$/, '');

(async () => {
  await globalSetup();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: '.auth/user.json', baseURL: BASE, viewport: { width: 1440, height: 900 }, ignoreHTTPSErrors: true });
  const page = await context.newPage();
  const api = [];
  page.on('request', (r) => { if (['POST', 'PUT', 'PATCH'].includes(r.method())) api.push(`${r.method()} ${r.url()} ${(r.postData() || '').slice(0, 400)}`); });

  await page.goto('/admin/admissions', { waitUntil: 'networkidle' });
  console.log('URL:', page.url());
  await page.screenshot({ path: 'scratch/emr67-admissions.png' });
  const draft = page.locator('text=Draft').first();
  console.log('Draft visible:', await draft.isVisible());
  if (await draft.isVisible()) await draft.click();
  await page.waitForTimeout(3000);

  const tabs = await page.locator('button').evaluateAll((bs) => bs.map((b) => b.innerText.trim()).filter((t) => /^\d+\./.test(t) || /history/i.test(t)));
  console.log('Tabs:', tabs);

  const sh = page.getByRole('button', { name: /Social History/i }).first();
  if (await sh.isVisible().catch(() => false)) {
    await sh.click();
    await page.waitForTimeout(2500);
    await page.screenshot({ path: 'scratch/emr67-social-history.png', fullPage: true });
    const inputs = await page.locator('main input, main textarea, form input').evaluateAll((els) => els.map((e) => ({
      tag: e.tagName, type: e.type, name: e.name, id: e.id, placeholder: e.placeholder, min: e.min, max: e.max, step: e.step,
      inputmode: e.inputMode, value: e.value, aria: e.getAttribute('aria-label'),
      label: (e.closest('div')?.parentElement?.innerText || '').slice(0, 80).replace(/\n/g, ' | '),
    })));
    console.log(JSON.stringify(inputs, null, 1));
    const html = await page.locator('main').first().innerHTML().catch(() => page.content());
    fs.writeFileSync('scratch/emr67-social-history.html', html);
  } else {
    console.log('No Social History tab found');
    fs.writeFileSync('scratch/emr67-page.html', await page.content());
  }
  console.log('API writes:', api);
  await browser.close();
})();
